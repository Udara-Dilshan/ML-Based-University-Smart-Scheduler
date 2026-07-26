import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell, PieChart, Pie
} from 'recharts';
import { Calendar, TrendingUp, AlertTriangle, Car, Bus, Truck, Activity, Info, BrainCircuit } from 'lucide-react';
import { forecastAPI, getUser } from '../services/api';
import AdminLayout from './admin/layout/AdminLayout';
import ResourceLayout from './resource/layout/ResourceLayout';

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#14B8A6", "#6B7280"];
const VEHICLE_COLORS = {
  "Bus": "#3B82F6",
  "Mini Bus": "#10B981",
  "Van": "#F59E0B",
  "Car": "#8B5CF6",
  "Truck": "#EC4899"
};

const VEHICLE_ICONS = {
  "Bus": <Bus size={18} />,
  "Mini Bus": <Bus size={18} />,
  "Van": <Car size={18} />,
  "Car": <Car size={18} />,
  "Truck": <Truck size={18} />
};

// ─── Utility Components ───────────────────────────────────────────────────────
const fmt = (n) => (n ?? 0).toLocaleString();

function KpiCard({ title, value, subtitle, icon, highlightColor = "blue" }) {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-green-600 bg-green-50 border-green-100",
    amber: "text-amber-600 bg-amber-50 border-amber-100",
    purple: "text-purple-600 bg-purple-50 border-purple-100",
    pink: "text-pink-600 bg-pink-50 border-pink-100",
  };
  const theme = colorMap[highlightColor] || colorMap.blue;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between transition-all hover:shadow-md">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h2 className="text-3xl font-bold mt-2 text-gray-900">{fmt(value)}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-2">{subtitle}</p>}
      </div>
      {icon && (
        <div className={`p-3 rounded-lg border ${theme}`}>
          {icon}
        </div>
      )}
    </div>
  );
}

function MiniVehicleCard({ type, count, percentage }) {
  const color = VEHICLE_COLORS[type] || COLORS[0];
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between border-l-4" style={{ borderLeftColor: color }}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md" style={{ backgroundColor: `${color}15`, color: color }}>
          {VEHICLE_ICONS[type] || <Car size={16} />}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{type}</p>
          <p className="text-xs text-gray-500">{percentage}% of demand</p>
        </div>
      </div>
      <div className="text-xl font-bold text-gray-900">
        {fmt(count)}
      </div>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="text-sm text-gray-500">{description}</p>}
    </div>
  );
}

function Card({ children, className = "" }) {
  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DemandForecast({ isComponent = false }) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState(null);

  const user = getUser();
  const isResourceManager = user?.role === "ResourceManager" || user?.role === "RESOURCE_MANAGER";
  const Layout = isResourceManager ? ResourceLayout : AdminLayout;

  // Initialize dates and fetch metrics
  useEffect(() => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setDate(today.getDate() + 30);
    
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(nextMonth.toISOString().split('T')[0]);

    // Fetch AI Confidence metrics
    forecastAPI.getMetrics()
      .then(res => setMetrics(res))
      .catch(err => console.error("Failed to load metrics", err));
  }, []);

  const handleForecast = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await forecastAPI.forecastVehicles({
        start_date: startDate,
        end_date: endDate
      });
      
      const chartData = response.map(day => ({
        date: day.date,
        total_predicted: day.total_predicted,
        Car: day.breakdown.Car || 0,
        Van: day.breakdown.Van || 0,
        "Mini Bus": day.breakdown['Mini Bus'] || 0,
        Bus: day.breakdown.Bus || 0,
        Truck: day.breakdown.Truck || 0
      }));
      
      setData(chartData);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch forecast data.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Data Aggregation for UI ───
  const { totalDemand, peakDay, typeBreakdown, donutData } = useMemo(() => {
    if (!data || data.length === 0) return { totalDemand: 0, peakDay: null, typeBreakdown: {}, donutData: [] };
    
    let total = 0;
    let peak = data[0];
    const breakdown = { "Bus": 0, "Mini Bus": 0, "Van": 0, "Car": 0, "Truck": 0 };

    data.forEach(day => {
      total += day.total_predicted;
      if (day.total_predicted > peak.total_predicted) peak = day;
      
      breakdown["Bus"] += day["Bus"] || 0;
      breakdown["Mini Bus"] += day["Mini Bus"] || 0;
      breakdown["Van"] += day["Van"] || 0;
      breakdown["Car"] += day["Car"] || 0;
      breakdown["Truck"] += day["Truck"] || 0;
    });

    const dData = Object.keys(breakdown)
      .filter(k => breakdown[k] > 0)
      .map(k => ({ name: k, value: breakdown[k] }));

    return { totalDemand: total, peakDay: peak, typeBreakdown: breakdown, donutData: dData };
  }, [data]);

  const content = (
    <>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Demand Forecast</h1>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
            <BrainCircuit size={14} className="text-blue-500" />
            AI-powered predictive analytics for resource management
          </p>
        </div>
        
        {/* Model Accuracy Badge */}
        {metrics && metrics.mae !== undefined && (
          <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-4 py-2 rounded-full shadow-sm">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              Avg Error: <span className="text-blue-700 font-bold">±{metrics.mae} Vehicles</span>
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-6">
          <AlertTriangle size={15} />{error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 mb-6">
        
        {/* Sidebar Controls */}
        <div className="col-span-1 space-y-6">
          <Card>
            <h3 className="mb-4 text-sm font-semibold text-gray-900">Forecast Settings</h3>
            <form onSubmit={handleForecast} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Start Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">End Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <button 
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-70 transition-colors shadow-sm"
              >
                {loading ? 'Analyzing...' : 'Generate Forecast'}
              </button>
            </form>
          </Card>
          
          {/* Quick Stats */}
          {data && (
            <div className="space-y-4">
              <KpiCard 
                title="Total Vehicles Needed" 
                value={totalDemand} 
                subtitle={`Across selected ${data.length} days`}
                icon={<Car size={24} />}
                highlightColor="blue"
              />
              <KpiCard 
                title="Peak Demand Day" 
                value={peakDay?.total_predicted || 0} 
                subtitle={peakDay ? new Date(peakDay.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' }) : ''}
                icon={<Activity size={24} />}
                highlightColor="purple"
              />
            </div>
          )}
        </div>
        
        {/* Main Chart Area */}
        <div className="col-span-1 lg:col-span-3 space-y-6">
          
          {/* Dual Charts Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Stacked Bar Chart */}
            <Card className="lg:col-span-2 min-h-[400px] flex flex-col">
              <SectionHeader 
                title="Daily Demand Timeline" 
                description="Predicted vehicle volume over the selected period" 
              />
              
              {!data && !loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                  <TrendingUp size={40} className="mb-3 text-gray-300" />
                  <p className="text-sm">Select a date range and click Generate to see the forecast.</p>
                </div>
              )}
              
              {loading && (
                <div className="flex-1 flex flex-col items-center justify-center text-blue-500">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mb-3"></div>
                  <p className="text-sm font-medium">Running ML Multi-Output Model...</p>
                </div>
              )}
              
              {data && !loading && (
                <div className="flex-1 w-full mt-4 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}
                        labelFormatter={(val) => new Date(val).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="Bus" stackId="a" fill={VEHICLE_COLORS["Bus"]} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Mini Bus" stackId="a" fill={VEHICLE_COLORS["Mini Bus"]} />
                      <Bar dataKey="Van" stackId="a" fill={VEHICLE_COLORS["Van"]} />
                      <Bar dataKey="Car" stackId="a" fill={VEHICLE_COLORS["Car"]} />
                      <Bar dataKey="Truck" stackId="a" fill={VEHICLE_COLORS["Truck"]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Donut Chart (Distribution) */}
            <Card className="lg:col-span-1 min-h-[400px] flex flex-col">
              <SectionHeader 
                title="Overall Distribution" 
                description="Percentage breakdown by type" 
              />
              
              {!data && !loading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-100"></div>
                </div>
              )}
              
              {loading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-8 border-gray-100 border-t-blue-500 animate-spin"></div>
                </div>
              )}

              {data && !loading && (
                <div className="flex-1 w-full relative min-h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={VEHICLE_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value, name) => [
                          `${value} ${name}${value !== 1 && !name.endsWith('s') ? 's' : ''}`, 
                          'Predicted Demand'
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-gray-900">{fmt(totalDemand)}</span>
                    <span className="text-xs text-gray-500">Total</span>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Vehicle Type Mini-Cards Grid */}
          {data && !loading && (
            <div>
              <h3 className="mb-4 text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Info size={16} className="text-blue-500" />
                Aggregated Resource Requirements
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Object.keys(typeBreakdown).map(type => {
                  const count = typeBreakdown[type];
                  const percentage = totalDemand > 0 ? Math.round((count / totalDemand) * 100) : 0;
                  return (
                    <MiniVehicleCard 
                      key={type} 
                      type={type} 
                      count={count} 
                      percentage={percentage} 
                    />
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );

  return isComponent ? (
    <>{content}</>
  ) : (
    <Layout>
      {content}
    </Layout>
  );
}
