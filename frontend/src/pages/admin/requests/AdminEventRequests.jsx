import AdminLayout from "../layout/AdminLayout";
import EventRequests from "../../resource/EventRequests";

export default function AdminEventRequests() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-6">Event Requests</h1>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <EventRequests isCardView={true} />
      </div>
    </AdminLayout>
  );
}
