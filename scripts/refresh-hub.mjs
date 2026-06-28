// Patch the three hub pages (teacher/student/school-admin) so they share:
//   1. Chat-style order — oldest at top, newest at bottom (auto-scroll to bottom).
//   2. New posts arriving → append + scroll, not "click to refresh" toast at top.
//   3. Refreshed visual flair (animated background, reaction-burst, glowing
//      staff bubbles, bigger composer).
//
// The three files are near-identical so we apply the same textual transforms
// and accept slight divergence in their localized labels.
import { readFileSync, writeFileSync } from "node:fs";

const FILES = [
  "src/app/teacher/hub/page.tsx",
  "src/app/student/hub/page.tsx",
  "src/app/school-admin/hub/page.tsx",
];

for (const f of FILES) {
  let src = readFileSync(f, "utf8");
  const before = src;

  // ── 1. Reverse rendering order — display oldest first so newest sits at
  //     the bottom (chat style).
  //     The main feed `byDay` builder loops `posts` (which are desc) — we
  //     reverse to asc inside the loop without changing state shape.
  src = src.replace(
    /const byDay: \{ day: string; items: Post\[\] \}\[\] = \[\];\s*posts\.forEach\(\(p\) => \{/g,
    `const byDay: { day: string; items: Post[] }[] = [];
  // Reverse the desc-from-API list so chat reads oldest → newest top-to-bottom.
  [...posts].reverse().forEach((p) => {`,
  );
  // Same trick for replies sub-feed (already asc on server but defensive).
  src = src.replace(
    /const byDay: \{ day: string; items: Post\[\] \}\[\] = \[\];\s*replies\.forEach\(\(r\) => \{/g,
    `const byDay: { day: string; items: Post[] }[] = [];
  [...replies].forEach((r) => {`,
  );

  // ── 2. Auto-scroll to bottom on initial load.
  //     Inject a useEffect after the posts-load effect.
  if (!src.includes("/* scroll-to-bottom-on-load */")) {
    src = src.replace(
      /(useEffect\(\(\) => \{\s*if \(!me\?\.school\?\.id\) return;\s*fetch\(`\/api\/hub\/posts\?school_id=\$\{me\.school\.id\}&limit=30`\)\s*\.then\(\(r\) => r\.json\(\)\)\s*\.then\(\(d\) => \{[^}]*?\}\);\s*\}, \[me\?\.school\?\.id\]\);)/,
      `$1

  /* scroll-to-bottom-on-load */
  useEffect(() => {
    if (loading) return;
    const el = feedRef.current;
    if (!el) return;
    // Run on next frame so the DOM is laid out.
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight; });
  }, [loading]);`,
    );
  }

  // ── 2b. When the realtime channel sees a new post, append + auto-scroll
  //     rather than buffering with a "X new messages" banner. We re-fetch
  //     to get the post with relations already populated.
  src = src.replace(
    /\.on\("postgres_changes", \{[\s\S]*?event: "INSERT"[\s\S]*?\}\, \(payload\) => \{\s*const p = payload\.new as Post;\s*if \(!p\.reply_to_id && p\.author\?\.id !== me\.id\) setNewCount\(\(c\) => c \+ 1\);\s*\}\)/,
    `.on("postgres_changes", {
        event: "INSERT", schema: "public", table: "posts",
        filter: \`school_id=eq.\${me.school.id}\`,
      }, (payload) => {
        const p = payload.new as { reply_to_id: string | null; author_id: string };
        if (p.reply_to_id || p.author_id === me.id) return;
        // Re-fetch the freshest top-level so we get author + reactions populated.
        fetch(\`/api/hub/posts?school_id=\${me.school!.id}&limit=1\`)
          .then((r) => r.json())
          .then((d) => {
            const fresh = (d.posts ?? [])[0];
            if (!fresh) return;
            setPosts((prev) => prev.some((q) => q.id === fresh.id) ? prev : [fresh, ...prev]);
            requestAnimationFrame(() => {
              const el = feedRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            });
          })
          .catch(() => {});
      })`,
  );

  // ── 2c. After the current user posts, scroll to bottom (not top).
  src = src.replace(
    /const handlePosted = \(p: Post\) => \{\s*setPosts\(\(prev\) => \[p, \.\.\.prev\]\);\s*setTimeout\(\(\) => feedRef\.current\?\.scrollTo\(\{ top: 0, behavior: "smooth" \}\), 80\);\s*\};/,
    `const handlePosted = (p: Post) => {
    setPosts((prev) => [p, ...prev]);
    setTimeout(() => {
      const el = feedRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 80);
  };`,
  );

  // ── 2d. "New posts" banner is now obsolete (new posts auto-append).
  src = src.replace(
    /\{newCount > 0 && \([\s\S]*?<\/button>\s*\)\}/,
    "{/* new-posts banner removed — posts auto-append */}",
  );

  // ── 3. Visual flair — add a richer animated background + reaction burst.
  //     Append a small <style> block; idempotent via marker comment.
  if (!src.includes("/* hub-viral-pack */")) {
    src = src.replace(
      /const css = `/,
      `const css = \`/* hub-viral-pack */
@keyframes hubBlob{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(40px,-30px) scale(1.07)}66%{transform:translate(-30px,30px) scale(.94)}}
@keyframes hubBlob2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-50px,40px) scale(1.1)}}
@keyframes burstFloat{0%{opacity:0;transform:translateY(0) scale(.6)}25%{opacity:1;transform:translateY(-20px) scale(1.3)}100%{opacity:0;transform:translateY(-70px) scale(.9)}}
@keyframes liveDot{0%,100%{box-shadow:0 0 0 0 rgba(82,196,26,.5)}70%{box-shadow:0 0 0 10px rgba(82,196,26,0)}}
.hub-bg-pattern::before,.hub-bg-pattern::after{content:'';position:absolute;border-radius:50%;filter:blur(80px);opacity:.45;pointer-events:none;}
.hub-bg-pattern::before{width:520px;height:520px;background:radial-gradient(circle,#E5B93C 0%,transparent 70%);top:-120px;inset-inline-end:-120px;animation:hubBlob 18s ease-in-out infinite;}
.hub-bg-pattern::after{width:460px;height:460px;background:radial-gradient(circle,#7A1E1E 0%,transparent 70%);bottom:-140px;inset-inline-start:-100px;animation:hubBlob2 22s ease-in-out infinite;opacity:.22;}
.chat-bubble-staff{position:relative;overflow:visible;}
.chat-bubble-staff::after{content:'';position:absolute;inset:-1.5px;border-radius:inherit;background:linear-gradient(135deg,rgba(229,185,60,.55),rgba(200,169,106,0) 50%,rgba(229,185,60,.45));z-index:-1;}
.hub-live-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#52C41A;margin-inline-end:6px;animation:liveDot 2s infinite;vertical-align:middle;}
.rx-burst{position:absolute;font-size:22px;pointer-events:none;animation:burstFloat .9s ease-out forwards;left:50%;top:0;transform-origin:center;}
.composer{background:linear-gradient(135deg,#fff,#FBF8F2)!important;}
.composer-focused{background:#fff!important;}
`,
    );
  }

  if (src !== before) {
    writeFileSync(f, src);
    console.log("patched", f);
  } else {
    console.log("no-op", f);
  }
}
