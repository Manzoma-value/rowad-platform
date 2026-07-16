import { createServerClient } from "@supabase/ssr";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const origin = (process.env.TEACHER_SMOKE_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "");
const email = process.env.TEACHER_SMOKE_EMAIL;
const password = process.env.TEACHER_SMOKE_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!email || !password) {
  throw new Error("Set TEACHER_SMOKE_EMAIL and TEACHER_SMOKE_PASSWORD before running the smoke test.");
}
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase public environment variables are missing.");
}

const cookieJar = new Map();
const supabase = createServerClient(supabaseUrl, supabaseKey, {
  cookies: {
    getAll: () => [...cookieJar].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => {
      for (const { name, value } of cookies) {
        if (value) cookieJar.set(name, value);
        else cookieJar.delete(name);
      }
    },
  },
});

const auth = await supabase.auth.signInWithPassword({ email, password });
if (auth.error || !auth.data.user) {
  throw new Error(`Teacher login failed: ${auth.error?.message ?? "unknown error"}`);
}

const results = [];
const failures = [];

function cookieHeader() {
  return [...cookieJar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function probe(path, options = {}, expected = [200]) {
  const started = performance.now();
  let response;
  let payload = null;
  try {
    response = await fetch(`${origin}${path}`, {
      redirect: "manual",
      ...options,
      headers: {
        Cookie: cookieHeader(),
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    const text = await response.text();
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text.slice(0, 180); }
    }
  } catch (error) {
    failures.push(`${path}: network failure (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }

  const elapsed = Math.round(performance.now() - started);
  const cacheControl = response.headers.get("cache-control") ?? "";
  const unsafeCache = /(?:^|,)\s*(?:public|s-maxage=)/i.test(cacheControl);
  const ok = expected.includes(response.status) && !unsafeCache;
  results.push({ path, method: options.method ?? "GET", status: response.status, elapsed, cacheControl, ok });

  if (!expected.includes(response.status)) {
    const detail = payload && typeof payload === "object" && "error" in payload ? ` (${payload.error})` : "";
    failures.push(`${path}: expected ${expected.join("/")}, received ${response.status}${detail}`);
  }
  if (unsafeCache) failures.push(`${path}: personalized response is publicly cacheable (${cacheControl})`);
  return { response, payload };
}

const teacherResult = await probe("/api/teacher");
const teacher = teacherResult?.payload ?? {};
const schoolId = teacher.school?.id;
const firstClass = teacher.classes?.[0];

const [groupsResult, workshopsResult, roadmapResult, lessonsResult, quizzesResult, reportsResult] = await Promise.all([
  probe("/api/teacher/groups"),
  probe("/api/teacher/workshops"),
  probe("/api/teacher/roadmap"),
  probe("/api/teacher/lessons"),
  probe("/api/teacher/quizzes"),
  probe("/api/teacher/reports"),
]);

await Promise.all([
  probe("/api/profile"),
  probe("/api/tenant"),
  probe("/api/teacher/model?stage=1"),
  probe("/api/teacher/model/my-score"),
  probe("/api/teacher/model/leaderboard"),
  schoolId ? probe(`/api/hub/posts?school_id=${encodeURIComponent(schoolId)}&limit=30`) : null,
  firstClass ? probe(`/api/teacher/announcements?classId=${encodeURIComponent(firstClass.id)}`) : null,
]);

const firstGroup = groupsResult?.payload?.groups?.[0];
if (firstGroup) {
  const [, assessmentsResult] = await Promise.all([
    probe(`/api/teacher/groups/${firstGroup.id}`),
    probe(`/api/teacher/groups/${firstGroup.id}/assessments`),
    probe(`/api/teacher/groups/${firstGroup.id}/announcements`),
    probe(`/api/teacher/groups/${firstGroup.id}/announcements`, { method: "POST", body: JSON.stringify({ content: "" }) }, [400]),
  ]);
  const firstAssessment = assessmentsResult?.payload?.assessments?.[0];
  if (firstAssessment) await probe(`/api/teacher/groups/${firstGroup.id}/assessments/${firstAssessment.id}`);
}

const firstWorkshop = workshopsResult?.payload?.workshops?.[0];
if (firstWorkshop) {
  await Promise.all([
    probe(`/api/teacher/workshops/${firstWorkshop.id}`),
    probe(`/api/teacher/workshops/${firstWorkshop.id}/messages`, { method: "POST", body: JSON.stringify({ body: "" }) }, [400]),
  ]);
}

const firstModule = roadmapResult?.payload?.roadmap?.stages?.flatMap((stage) => stage.modules ?? [])?.[0];
if (firstModule) await probe(`/api/teacher/modules/${firstModule.id}`);

const firstLesson = lessonsResult?.payload?.lessons?.[0];
if (firstLesson) {
  await Promise.all([
    probe(`/api/teacher/lessons/${firstLesson.id}`),
    probe(`/api/teacher/lessons/${firstLesson.id}/completions`),
    probe(`/api/teacher/lessons/${firstLesson.id}/reorder`, { method: "PATCH", body: JSON.stringify({}) }, [400]),
    probe(`/api/teacher/lessons/${firstLesson.id}/questions`, { method: "POST", body: JSON.stringify({}) }, [400]),
    probe(`/api/teacher/lessons/${firstLesson.id}/contents`, { method: "POST", body: JSON.stringify({}) }, [400]),
  ]);
}

const firstQuiz = Array.isArray(quizzesResult?.payload) ? quizzesResult.payload[0] : null;
if (firstQuiz) {
  await Promise.all([
    probe(`/api/teacher/quizzes/${firstQuiz.id}`),
    probe(`/api/teacher/quizzes/${firstQuiz.id}/completions`),
  ]);
}

const firstStudent = reportsResult?.payload?.classes?.flatMap((item) => item.students ?? [])?.[0];
if (firstStudent) await probe(`/api/teacher/reports/students/${firstStudent.id}`);

await Promise.all([
  probe("/api/teacher/announcements", { method: "POST", body: JSON.stringify({}) }, [400]),
  probe("/api/teacher/announcements", { method: "DELETE" }, [400]),
  probe("/api/teacher/lessons", { method: "POST", body: JSON.stringify({}) }, [400]),
  probe("/api/teacher/quizzes", { method: "POST", body: JSON.stringify({}) }, [400]),
]);

const slow = results.filter((item) => item.elapsed >= 2000).sort((a, b) => b.elapsed - a.elapsed);
for (const result of results) {
  const cache = result.cacheControl ? ` cache=${result.cacheControl}` : "";
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.method.padEnd(6)} ${String(result.status).padEnd(3)} ${String(result.elapsed).padStart(5)}ms ${result.path}${cache}`);
}
console.log(`\n${results.length - failures.length}/${results.length} probes passed. ${slow.length} endpoint(s) took at least 2s.`);
if (slow.length) console.log(`Slowest: ${slow.slice(0, 5).map((item) => `${item.path} (${item.elapsed}ms)`).join(", ")}`);

await supabase.auth.signOut();
if (failures.length) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
