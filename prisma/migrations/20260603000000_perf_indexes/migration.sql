
-- CreateIndex
CREATE INDEX "announcements_class_id_created_at_idx" ON "announcements"("class_id", "created_at");

-- CreateIndex
CREATE INDEX "announcements_teacher_id_idx" ON "announcements"("teacher_id");

-- CreateIndex
CREATE INDEX "classes_teacher_id_idx" ON "classes"("teacher_id");

-- CreateIndex
CREATE INDEX "quizzes_teacher_id_created_at_idx" ON "quizzes"("teacher_id", "created_at");

-- CreateIndex
CREATE INDEX "quizzes_class_id_idx" ON "quizzes"("class_id");

-- CreateIndex
CREATE INDEX "students_school_id_idx" ON "students"("school_id");

-- CreateIndex
CREATE INDEX "students_class_id_idx" ON "students"("class_id");

-- CreateIndex
CREATE INDEX "students_school_id_onboarding_status_idx" ON "students"("school_id", "onboarding_status");

-- CreateIndex
CREATE INDEX "teachers_school_id_idx" ON "teachers"("school_id");

