// Lightweight runtime translator: walks text nodes and swaps English <-> Arabic.
// Falls back to original English text when no translation exists.

const dict: Record<string, string> = {
  // Sidebar / nav
  "Home": "الرئيسية",
  "Plans": "الخطط",
  "Funds": "التمويل",
  "Projects": "المشاريع",
  "Settings": "الإعدادات",
  "Exit": "خروج",

  // Account / settings
  "Account Management": "إدارة الحساب",
  "Preferences": "التفضيلات",
  "Team & Permissions": "الفريق والصلاحيات",
  "Email": "البريد الإلكتروني",
  "Password": "كلمة المرور",
  "Edit": "تعديل",
  "Save": "حفظ",
  "Cancel": "إلغاء",
  "Delete": "حذف",

  // Preferences rows
  "Theme Mode": "الوضع الليلي",
  "Language": "اللغة",
  "Task Notifications": "إشعارات المهام",
  "Default Task View": "عرض المهام الافتراضي",
  "English": "الإنجليزية",
  "Kanban": "كانبان",
  "List": "قائمة",
  "Calendar": "التقويم",
  "Timeline": "الجدول الزمني",

  // Projects panel
  "Add Project": "إضافة مشروع",
  "Company Projects": "مشاريع الشركة",
  "Project Information": "معلومات المشروع",
  "Project Name": "اسم المشروع",
  "Project Description": "وصف المشروع",
  "Project name is required": "اسم المشروع مطلوب",
  "Project description is required": "وصف المشروع مطلوب",
  "Save Add": "حفظ وإضافة",

  // Team
  "Add New Member": "إضافة عضو جديد",
  "Add New Members": "إضافة أعضاء جدد",
  "Team Members": "أعضاء الفريق",
  "Team members": "أعضاء الفريق",
  "Team Performance": "أداء الفريق",
  "Name": "الاسم",
  "Role": "الدور",
  "Permissions": "الصلاحيات",
  "Actions": "الإجراءات",
  "Select Role": "اختر الدور",
  "Select Permissions": "اختر الصلاحيات",
  "Designer": "مصمم",
  "Developer": "مطور",
  "Manager": "مدير",
  "Marketing": "تسويق",
  "Project manager": "مدير مشروع",
  "Financial": "مالي",
  "Admin": "مشرف",
  "Editor": "محرر",
  "Viewer": "مشاهد",

  // Funds / Plans
  "Request Funds": "طلب تمويل",
  "Please enter phone number": "الرجاء إدخال رقم الهاتف",
  "Please enter reason": "الرجاء إدخال السبب",
  "Please enter request date": "الرجاء إدخال تاريخ الطلب",
  "Please enter the amount": "الرجاء إدخال المبلغ",
  "Please select repayment period": "الرجاء اختيار فترة السداد",
  "Proposed Repayment Period": "فترة السداد المقترحة",
  "Request immediate Approval": "طلب موافقة فورية",
  "Send to Vote": "إرسال للتصويت",
  "Startup": "ناشئ",
  "Growth": "نمو",
  "Scale": "توسع",
  "Stare Plan": "خطة البدء",
  "Test": "تجربة",
  "Featurs:": "المزايا:",

  // Tasks / projects
  "Tasks": "المهام",
  "To Do": "قيد التنفيذ",
  "Smart Agents": "الوكلاء الأذكياء",
  "Current Task": "المهمة الحالية",
  "Overdue tasks": "المهام المتأخرة",
  "Ongoing Projects": "المشاريع الجارية",

  // Dashboard
  "Total Revenue": "إجمالي الإيرادات",
  "Current Balance": "الرصيد الحالي",
  "Sales": "المبيعات",
  "Popularity": "الشعبية",
  "Customer percentage": "نسبة العملاء",
  "Error rate": "نسبة الأخطاء",
  "API Calls": "طلبات API",

  // Calendar weekdays / months (short)
  "Mon": "إثن",
  "Tue": "ثلا",
  "Wed": "أرب",
  "Thu": "خمي",
  "Fri": "جمع",
  "Sat": "سبت",
  "Sun": "أحد",
  "January": "يناير",
  "February": "فبراير",
  "March": "مارس",
  "April": "أبريل",
  "May": "مايو",
  "June": "يونيو",
  "July": "يوليو",
  "August": "أغسطس",
  "September": "سبتمبر",
  "October": "أكتوبر",
  "November": "نوفمبر",
  "December": "ديسمبر",

  // Status words on dashboard
  "Available": "متاح",
  "Busy": "مشغول",
  "Unavailable": "غير متاح",
  "Now working": "يعمل الآن",
};

const originals = new WeakMap<Text, string>();
let observer: MutationObserver | null = null;
let currentLang: "en" | "ar" = "en";

function walk(root: Node) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n: Node | null = w.nextNode();
  while (n) {
    apply(n as Text);
    n = w.nextNode();
  }
}

function apply(node: Text) {
  const raw = originals.get(node) ?? node.nodeValue ?? "";
  if (!originals.has(node)) originals.set(node, raw);
  if (currentLang === "ar") {
    const key = raw.trim();
    const tr = dict[key];
    if (tr) {
      const leading = raw.match(/^\s*/)?.[0] ?? "";
      const trailing = raw.match(/\s*$/)?.[0] ?? "";
      const next = leading + tr + trailing;
      if (node.nodeValue !== next) node.nodeValue = next;
    }
  } else {
    if (node.nodeValue !== raw) node.nodeValue = raw;
  }
}

export function setLanguage(lang: "en" | "ar") {
  currentLang = lang;
  const root = document.documentElement;
  root.lang = lang;
  root.dir = lang === "ar" ? "rtl" : "ltr";

  walk(document.body);

  if (observer) observer.disconnect();
  observer = new MutationObserver((muts) => {
    for (const m of muts) {
      m.addedNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) apply(n as Text);
        else if (n.nodeType === Node.ELEMENT_NODE) walk(n);
      });
      if (m.type === "characterData" && m.target.nodeType === Node.TEXT_NODE) {
        apply(m.target as Text);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
}
