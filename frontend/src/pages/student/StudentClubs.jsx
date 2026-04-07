import { useState } from "react";
import { Users, Star } from "lucide-react";

const clubs = [
  { code: "CS", name: "Computer Science Society", type: "Technical", members: 245, president: "Alex Kumar",    meeting: "Every Friday, 4:00 PM",   color: "bg-orange-500", member: true,  starred: true  },
  { code: "DC", name: "Drama Club",               type: "Cultural",  members: 132, president: "Sarah Williams",meeting: "Tue & Thursday, 5:00 PM", color: "bg-purple-500", member: true,  starred: true  },
  { code: "CC", name: "Cricket Club",             type: "Sports",    members: 187, president: "Rahul Sharma",  meeting: "Monday, 4:00 PM",         color: "bg-green-500",  member: false, starred: false },
];

const filters = ["All","Technical","Cultural","Sports","Academic"];

export default function StudentClubs() {
  const [active, setActive] = useState("All");
  const filtered = clubs.filter((c) => active === "All" || c.type === active);

  return (
    <div className="space-y-6">

      {/* Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6">
        <div className="grid grid-cols-3 gap-6 text-white">
          {[
            { label: "Active Clubs",     value: "9" },
            { label: "Your Memberships", value: "4" },
            { label: "Featured Clubs",   value: "4" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className="bg-white bg-opacity-20 p-3 rounded-xl">
                <Users size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-sm opacity-80">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button key={f} onClick={() => setActive(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              active === f ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((club) => (
          <div key={club.code} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className={`${club.color} h-32 flex items-center justify-center relative`}>
              {club.member && (
                <span className="absolute top-3 left-3 text-xs bg-white bg-opacity-90 text-gray-700 px-2 py-0.5 rounded-full font-medium">Member</span>
              )}
              {club.starred && <Star size={16} className="absolute top-3 right-3 text-yellow-400 fill-yellow-400" />}
              <span className="text-white text-3xl font-bold">{club.code}</span>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{club.type}</span>
                <span className="text-xs text-gray-500 flex items-center gap-1"><Users size={11} />{club.members}</span>
              </div>
              <p className="font-semibold text-gray-900 text-sm">{club.name}</p>
              <p className="text-xs text-gray-500 mt-1">President: {club.president}</p>
              <p className="text-xs text-gray-400 mt-0.5">{club.meeting}</p>
              <button className={`mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition ${
                club.member ? "bg-gray-100 text-gray-500" : "bg-blue-600 text-white hover:bg-blue-700"
              }`}>
                {club.member ? "Member ✓" : "Join Club"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}