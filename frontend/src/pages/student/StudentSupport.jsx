import { Search, BookOpen, Video, MessageCircle, FileText } from "lucide-react";

const quickActions = [
  { icon: BookOpen,      label: "Knowledge Base",  desc: "Browse articles",   color: "text-blue-400"   },
  { icon: Video,         label: "Video Tutorials", desc: "Watch guides",      color: "text-purple-400" },
  { icon: MessageCircle, label: "Live Chat",        desc: "Chat with support", color: "text-green-400"  },
  { icon: FileText,      label: "Submit Ticket",    desc: "Create request",    color: "text-orange-400" },
];

const faqs = [
  { q: "How do I register for next semester?",   a: "Go to Academic → Registration and follow the steps." },
  { q: "How can I view my timetable?",           a: "Click on Timetable in the sidebar menu."            },
  { q: "How do I submit a medical certificate?", a: "Go to Support and use the Submit Ticket option."    },
];

export default function StudentSupport() {
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
            return (
              <button key={a.label} className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl p-4 text-left transition">
                <Icon size={24} className={`${a.color} mb-2`} />
                <p className="text-white font-semibold text-sm">{a.label}</p>
                <p className="text-white opacity-70 text-xs mt-0.5">{a.desc}</p>
              </button>
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
            <input type="text" placeholder="Search FAQs..."
              className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-4 hover:bg-gray-50">
                <p className="text-sm font-medium text-gray-900">{faq.q}</p>
                <p className="text-xs text-gray-500 mt-1">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            {[
              { label: "Academic Office", email: "academic@uwu.ac.lk", phone: "+94 55 2226 601", initials: "AO", color: "bg-blue-500"  },
              { label: "IT Support",      email: "it@uwu.ac.lk",       phone: "+94 55 2226 602", initials: "IT", color: "bg-green-500" },
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