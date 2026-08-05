import { Info, ExternalLink } from "lucide-react";

export default function AboutSystemCard() {
  const teamMembers = [
    { name: "W.N.M Chathuranga", index: "UWU/ICT/21/010", role: "Lead Developer", link: "https://github.com/Nadeesh-Malaka/" },
    { name: "P.G.U.Dilshan", index: "UWU/ICT/21/013" },
    { name: "S.W.H Madushan", index: "UWU/ICT/21/032" },
    { name: "S.A. Wellalage", index: "UWU/ICT/21/042" },
    { name: "S.D.N.Silva", index: "UWU/ICT/21/077" }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-8 overflow-hidden">
      <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
          <Info size={20} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">System Information & Credits</h2>
          <p className="text-sm text-gray-500">ICT 481-6 Capstone Project - Group 14</p>
        </div>
      </div>
      
      <div className="p-6">
        <p className="text-sm text-gray-700 mb-6 leading-relaxed">
          This <strong>Smart Scheduling & Dynamic Resource Management System</strong> was developed by students of 
          Uva Wellassa University as part of their final year capstone project. 
          The system utilizes advanced Genetic Algorithms and Machine Learning for conflict-free resource allocation.
        </p>
        
        <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Development Team</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamMembers.map((member, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
              <div>
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {member.name}
                  {member.role && (
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                      {member.role}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{member.index}</p>
              </div>
              {member.link && (
                <a 
                  href={member.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                  title="View GitHub Profile"
                >
                  <ExternalLink size={16} />
                </a>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest">
            Uva Wellassa University of Sri Lanka
          </p>
        </div>
      </div>
    </div>
  );
}
