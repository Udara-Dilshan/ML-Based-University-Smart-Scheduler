import AdminLayout from "../layout/AdminLayout";
import VehicleRequests from "../../resource/VehicleRequests";

export default function AdminVehicleRequests() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-semibold mb-6">Vehicle Requests</h1>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <VehicleRequests isCardView={true} isViewOnly={true} />
      </div>
    </AdminLayout>
  );
}
