import AdminLayout from "../layout/AdminLayout"

export default function Settings(){

return(

<AdminLayout>

<h1 className="text-2xl font-semibold mb-6">
Settings
</h1>

<div className="bg-white p-6 rounded shadow">

<input
placeholder="Semester Start Date"
className="border p-2 rounded mr-4"
/>

<input
placeholder="Semester End Date"
className="border p-2 rounded"
/>

<button className="ml-4 bg-blue-500 text-white px-4 py-2 rounded">
Save
</button>

</div>

</AdminLayout>

)

}