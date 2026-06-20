import { useState } from "react";
import { Search, Globe, GraduationCap, FileDown, Bug } from "lucide-react";

const quickActions = [
  {
    icon: Globe,
    label: "UWU Website",
    desc: "Official university website",
    color: "text-blue-400",
    href: "https://www.uwu.ac.lk/",
  },
  {
    icon: GraduationCap,
    label: "UWU VLE",
    desc: "Virtual Learning Environment",
    color: "text-purple-400",
    href: "https://vle.uwu.ac.lk/",
  },
  {
    icon: FileDown,
    label: "User Guide",
    desc: "Download system manual",
    color: "text-green-400",
    href: "/docs/user-guide.pdf",
    download: true,
  },
  {
    icon: Bug,
    label: "Report an Issue",
    desc: "Report timetable or system errors",
    color: "text-orange-400",
    href: "https://mail.google.com/mail/?view=cm&fs=1&to=itcenter@uwu.ac.lk&su=System%20Issue%20Report%20from%20Student",
  },
];

const faqs = [
  {
    q: "What should I do if there is a clash in my timetable?",
    a: "Please use the 'Report an Issue' option to notify the academic administration immediately.",
  },
  {
    q: "How do I register for the upcoming semester?",
    a: "Navigate to the 'Semester Registration' tab in the sidebar during the official registration period and select your modules.",
  },
  {
    q: "Where do I submit a medical certificate?",
    a: "Medical certificates must be handed over physically to the Examination Branch within 7 days of your absence.",
  },
];

export default function StudentSupport() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Support Center</h2>
        <p className="text-sm text-gray-500">Get help and find answers to your questions</p>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6">
        <h3 className="text-white font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            const content = (
              <>
                <Icon size={24} className={`${a.color} mb-2`} />
                <p className="text-white font-semibold text-sm">{a.label}</p>
                <p className="text-white opacity-70 text-xs mt-0.5">{a.desc}</p>
              </>
            );
            return (
              a.href ? (
                <a
                  key={a.label}
                  href={a.href}
                  target={a.href.startsWith("mailto:") || a.download ? undefined : "_blank"}
                  rel="noreferrer"
                  download={a.download}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl p-4 text-left transition"
                >
                  {content}
                </a>
              ) : (
                <button
                  key={a.label}
                  type="button"
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl p-4 text-left transition"
                >
                  {content}
                </button>
              )
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* FAQ */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" 
            />
          </div>
          <div className="space-y-3">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50">
                  <p className="text-sm font-medium text-gray-900">{faq.q}</p>
                  <p className="text-xs text-gray-500 mt-1">{faq.a}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 py-4 text-center">No matching FAQs found.</p>
            )}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            {[
              {
                label: "Student Affairs Division",
                email: "studentaffairs@uwu.ac.lk",
                phone: "+94 55 2226 622",
                initials: "SA",
                color: "bg-blue-500",
              },
              {
                label: "Examination Branch",
                email: "exams@uwu.ac.lk",
                phone: "+94 55 2226 633",
                initials: "EB",
                color: "bg-purple-500",
              },
              {
                label: "IT Center",
                email: "itcenter@uwu.ac.lk",
                phone: "+94 55 2226 602",
                initials: "IT",
                color: "bg-green-500",
              },
            ].map((c) => (
              <div key={c.label} className="flex items-start gap-3">
                <div className={`w-8 h-8 ${c.color} rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                  {c.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.label}</p>
                  <p className="text-xs text-gray-500">{c.email}</p>
                  <p className="text-xs text-gray-500">{c.phone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}