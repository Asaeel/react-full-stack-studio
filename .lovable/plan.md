# Plan — Department Roles, Delegation Workflow & UI Reorg

طلبك كبير وفيه أجزاء كثيرة. هذا تفصيل شامل لكل التعديلات قبل ما أبدأ التنفيذ.

## 1. الأدوار (Roles)

- **المدير العام (Owner)** = صاحب الحساب الأصلي (manager).
- **Admin** على قسم (Financial / Development / Design / Marketing / …) = مدير قسم.
- **Editor** = موظف عادي تحت قسم معين.

عند Add New Member:
- Role = القسم (Financial, Development, …)
- Permissions = Admin أو Editor
- يُحفظ في `employees.permissions` + `employees.role` (موجودين فعلاً).

## 2. صفحة الموظف — Reorg

شريط علوي فيه أزرار: **Tasks | Performance | Meetings** + **Funding Requests** (فقط لو Admin قسم Financial).

## 3. صلاحيات Admin قسم

Admin قسم لما يفتح صفحته يشوف:
- Tasks اللي وصلته من المدير العام
- موظفي قسمه (Editors بنفس `role`)
- زر **Distribute Task** على كل تاسك
- Meetings (يقدر يسوي اجتماع لموظفي قسمه فقط)
- Funding Requests (فقط لو قسمه Financial)

## 4. Task Delegation Flow (التوزيع)

```
Owner ─task─▶ Admin(قسم) ─split─▶ Editors ─submit─▶ Admin ─review─▶ Owner
                  ▲                    │                  │
                  └──── revise ────────┘  ◀─── revise ────┘
```

**Admin يستلم تاسك:**
- يضغط Distribute → يختار عدد التاسكات الفرعية (Step بين 1-N)
- صفحة Wizard بخطوات (Next/Back زي Steps) لكل subtask: اسم، وصف، موظف، أولوية، deadline
- يقدر يرجع/يعدّل العدد ويضيف صفحة جديدة بمرونة
- Add Task → ترسل لكل Editor تاسك مستقل مربوط بالتاسك الأصلي (parent)

**Editor:**
- يستلم التاسك باسم الـ Admin اللي أرسله
- يقدر يرفع ملفات + يسلّم

**Admin يستلم Submission:**
- يشوف الملفات والوصف، يحمّل، إما:
  - **Forward to Owner** (يمرر للمدير العام) — فقط لما كل الـ subtasks الفرعية تنسلّم
  - **Request Revision** + تعليق → يرجع للـ Editor مميز بلون + شارة "Revision Requested"

**Owner يستلم:**
- معلومات التاسك + اسم مدير القسم + أسماء الموظفين + ملخص دور كل واحد + كل الملفات
- إما يقبل، أو **Request Revision** + تعليق → يرجع للـ Admin بنفس الـ flow

**Editor revision:** ملفات الإعادة بلون مميز + شارة "Revised"

## 5. Meetings للـ Admin

نفس component الاجتماعات الموجود، لكن قائمة المدعوين تتفلتر على موظفي قسمه فقط.

## 6. Calendar Month Navigation

أسهم يمين/يسار تغيّر الشهر (وتلف للسنة التالية/السابقة)، واسم الشهر يظهر بوضوح. (موجود جزئياً، نتأكد إنه يشتغل صح.)

## 7. الإشعارات

كل event (تاسك جديد، تسليم، revision، forward) يصير notification للمستلم.

---

## 8. تغييرات قاعدة البيانات المطلوبة

هذا الكود SQL لازم تنفّذه في **Lovable Cloud → SQL Editor**:

```sql
-- 1) إضافة أعمدة على tasks للـ delegation
alter table public.tasks
  add column if not exists parent_task_id uuid references public.tasks(id) on delete cascade,
  add column if not exists assigned_by uuid,                 -- user_id of admin/owner who assigned
  add column if not exists assigned_by_role text,            -- 'owner' | 'admin'
  add column if not exists description text,
  add column if not exists revision_note text,
  add column if not exists revision_count int not null default 0,
  add column if not exists forwarded_to_owner boolean not null default false,
  add column if not exists owner_status text;                -- null | 'pending' | 'approved' | 'revision'

-- 2) ملفات متعددة لكل تاسك (بدل عمود واحد)
create table if not exists public.task_files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  uploaded_by uuid not null,
  uploader_role text not null,    -- 'editor' | 'admin' | 'owner'
  file_name text not null,
  file_url text not null,
  is_revision boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.task_files to authenticated;
grant all on public.task_files to service_role;
alter table public.task_files enable row level security;
create policy "task_files_all_auth" on public.task_files
  for all to authenticated using (true) with check (true);

-- 3) إشعارات
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,                 -- recipient (auth user id OR employee id)
  recipient_type text not null,          -- 'manager' | 'employee'
  kind text not null,                    -- 'task_new' | 'task_submitted' | 'task_revision' | 'task_forwarded' | 'meeting'
  title text not null,
  body text,
  task_id uuid,
  meeting_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notifications_all_auth" on public.notifications
  for all to authenticated using (true) with check (true);

-- 4) إضافة عمود department على meetings (لتفلتر اجتماعات الـ admin)
alter table public.meetings
  add column if not exists department text,
  add column if not exists created_by_role text;  -- 'owner' | 'admin'
```

> ملاحظة: جدول `meetings` كان من الـ ZIP السابق — لو ما تم إنشاؤه بعد، شغّل أولاً ملف `run_in_sql_editor.sql` اللي سويته سابقاً.

---

## 9. ملفات هتتغير/تنضاف

- `src/routes/employee.tsx` — تبويبات Tasks/Performance/Meetings/Funding، فلترة حسب permissions
- `src/components/AdminTaskInbox.tsx` (جديد) — Admin يستلم/يوزع
- `src/components/TaskDistributeWizard.tsx` (جديد) — wizard متعدد الخطوات
- `src/components/TaskReviewPanel.tsx` (جديد) — مراجعة Admin/Owner + Request Revision
- `src/components/EditorTaskCard.tsx` (جديد) — عرض التاسك للـ Editor مع ملفات وrevision badge
- `src/components/NotificationsBell.tsx` (جديد) — جرس إشعارات
- `src/lib/tasks.functions.ts` (جديد) — distribute/submit/forward/revise/approve server fns
- `src/components/MeetingsCalendar.tsx` — تأكيد أسهم الشهر + فلترة موظفين بالقسم للـ admin
- `src/routes/index.tsx` — عرض الموظفين مع badge Admin/Editor، وتمرير الـ submissions للـ Owner من الـ admins فقط

---

## 10. حجم الشغل

هذا workload كبير (≈ 8-10 ملفات جديدة + تعديل 3 رئيسية). راح أنفذه على دفعة واحدة بعد ما توافق على الخطة وتنفذ SQL أعلاه.

**هل أبدأ التنفيذ؟** ولو تبغين نقسّمها على مراحل (مثلاً نبدأ بـ Roles + Employee Reorg + Month Navigation أولاً، ثم Delegation Flow في رد ثاني) قوليلي.
