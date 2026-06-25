import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const revenueData = [
  { time: "10:30 AM", value: 3000 },
  { time: "11:00 AM", value: 2500 },
  { time: "11:30 AM", value: 4000 },
  { time: "12:00 AM", value: 3200 },
  { time: "12:30 AM", value: 5500 },
  { time: "01:00 PM", value: 4800 },
  { time: "01:30 PM", value: 7546 },
  { time: "02:00 PM", value: 8200 },
  { time: "02:30 PM", value: 7800 },
  { time: "03:00 PM", value: 8500 },
  { time: "03:30 PM", value: 7200 },
];

const customerData = [
  { name: "Segment A", value: 45 },
  { name: "Segment B", value: 45 },
  { name: "Segment C", value: 10 },
];

const PIE_COLORS = ["#848FE1", "#3F467F", "#DADCF5"];

const projects = [
  { id: "01", name: "Home Decore Range", popularity: 72, sales: 46 },
  { id: "02", name: "Disney Princess Dress", popularity: 85, sales: 17 },
  { id: "03", name: "Bathroom Essentials", popularity: 55, sales: 19 },
  { id: "04", name: "Apple Smartwatch", popularity: 90, sales: 29 },
];

const teamPerformance = [
  { state: "NY", value: 120, max: 120 },
  { state: "MA", value: 80, max: 120 },
  { state: "NH", value: 70, max: 120 },
  { state: "OR", value: 50, max: 120 },
];

const errorRateData = [
  { name: "Error", value: 62 },
  { name: "Ok", value: 38 },
];

const ERROR_COLORS = ["#3F467F", "#DADCF5"];

const quickActions = [
  { label: "Finance Reports" },
  { label: "Download Report" },
  { label: "Upcoming Meetings" },
];

export default function HomeDashboard() {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* Hero Banner */}
      <div className="relative rounded-[24px] overflow-hidden min-h-[200px] md:min-h-[240px] shadow-xl">
        <img
          src="https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=2070&auto=format&fit=crop"
          alt="Dashboard background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b3e]/80 via-[#0d1b3e]/60 to-[#0d1b3e]/70" />
        <div className="relative z-10 p-6 md:p-8 h-full flex flex-col justify-between gap-6">
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <div
                key={action.label}
                className="bg-white/90 backdrop-blur-sm rounded-[16px] px-4 py-3 flex items-start justify-between gap-6 cursor-pointer hover:bg-white transition-colors min-w-[140px] group shadow-sm"
              >
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold text-[#1a1a2e] leading-tight">{action.label}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="opacity-40">
                    <circle cx="2" cy="2" r="1" fill="#1a1a2e"/>
                    <circle cx="7" cy="2" r="1" fill="#1a1a2e"/>
                    <circle cx="12" cy="2" r="1" fill="#1a1a2e"/>
                  </svg>
                  <div className="w-6 h-6 rounded-full bg-[#3F467F] flex items-center justify-center mt-2 group-hover:bg-[#727FE5] transition-colors">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 8L8 2M8 2H4M8 2V6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
            <div className="bg-[#727FE5]/90 backdrop-blur-sm rounded-[16px] px-5 py-3 flex flex-col gap-2 cursor-pointer hover:bg-[#727FE5] transition-colors min-w-[160px] shadow-sm">
              <span className="text-white font-bold text-[13px]">Add New Members</span>
              <div className="bg-white/20 rounded-[10px] h-8 flex items-center px-3">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 2v10M2 7h10" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats + Error Rate + Team Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stats Row */}
        <div className="lg:col-span-7 bg-white rounded-[20px] p-5 shadow-sm border border-[#DADCF5]/50 flex flex-wrap gap-4 items-center justify-between">
          {[
            { icon: "📄", label: "Projects", value: "3" },
            { icon: "↕️", label: "Requests", value: "3456" },
            { icon: "👤", label: "Users", value: "3" },
            { icon: "🗂️", label: "Storage", value: "128/500 GB" },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F3F2F7] rounded-[10px] flex items-center justify-center text-lg">
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] text-[#9197B3] font-medium">{stat.label}</p>
                <p className="text-sm font-bold text-[#333366]">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Error Rate + Team Performance */}
        <div className="lg:col-span-5 bg-white rounded-[20px] p-5 shadow-sm border border-[#DADCF5]/50 flex gap-6 items-center justify-around flex-wrap">
          {/* Error Rate Donut */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-bold text-[#333366] mb-1">Error rate</p>
            <div className="relative w-20 h-20">
              <PieChart width={80} height={80}>
                <Pie
                  data={errorRateData}
                  cx={35}
                  cy={35}
                  innerRadius={22}
                  outerRadius={35}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  strokeWidth={0}
                >
                  {errorRateData.map((_, index) => (
                    <Cell key={index} fill={ERROR_COLORS[index]} />
                  ))}
                </Pie>
              </PieChart>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-[#333366]">
                62%
              </span>
            </div>
          </div>

          {/* Team Performance */}
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold text-[#333366] mb-1">Team Performance</p>
            {teamPerformance.map((item) => (
              <div key={item.state} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#333366] w-5">{item.state}</span>
                <div className="w-20 md:w-28 h-2 bg-[#F3F2F7] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#727FE5] rounded-full"
                    style={{ width: `${(item.value / item.max) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-[#9197B3] font-medium">{item.value}K</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Revenue + Customer Percentage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Total Revenue Line Chart */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 shadow-sm border border-[#DADCF5]/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#333366] font-hind">Total Revenue</h2>
            <svg width="20" height="16" viewBox="0 0 20 16" fill="none" className="opacity-40">
              <rect y="0" width="20" height="2" rx="1" fill="#333366"/>
              <rect y="7" width="14" height="2" rx="1" fill="#333366"/>
              <rect y="14" width="8" height="2" rx="1" fill="#333366"/>
            </svg>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F2F7" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9, fill: "#9197B3" }}
                  tickLine={false}
                  axisLine={false}
                  interval={1}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: "#9197B3" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white rounded-[10px] shadow-lg px-4 py-2 border border-[#DADCF5]">
                          <p className="text-[10px] text-[#9197B3]">API Calls</p>
                          <p className="text-sm font-bold text-[#333366]">{payload[0].value}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3F467F"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: "#727FE5", strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customer Percentage Pie Chart */}
        <div className="lg:col-span-5 bg-white rounded-[24px] p-6 shadow-sm border border-[#DADCF5]/50 flex flex-col">
          <h2 className="text-xl font-bold text-[#333366] font-hind mb-4">Customer percentage</h2>
          <div className="flex-1 flex items-center justify-center relative">
            <PieChart width={220} height={200}>
              <Pie
                data={customerData}
                cx={105}
                cy={95}
                outerRadius={90}
                innerRadius={0}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
                strokeWidth={2}
                stroke="white"
              >
                {customerData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index]} />
                ))}
              </Pie>
            </PieChart>
            {/* Labels */}
            <div className="absolute inset-0 pointer-events-none">
              <span className="absolute top-[30%] left-[30%] text-[11px] font-bold text-white">10%</span>
              <span className="absolute top-[55%] left-[15%] text-[11px] font-bold text-[#3F467F]">45%</span>
              <span className="absolute top-[40%] right-[10%] text-[11px] font-bold text-[#333366]">45%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ongoing Projects + Credit Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ongoing Projects Table */}
        <div className="lg:col-span-7 bg-white rounded-[24px] p-6 shadow-sm border border-[#DADCF5]/50">
          <h2 className="text-xl font-bold text-[#333366] font-hind mb-5">Ongoing Projects</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr>
                  <th className="text-left text-[10px] font-bold text-[#9197B3] pb-3 pr-4 w-8">#</th>
                  <th className="text-left text-[10px] font-bold text-[#9197B3] pb-3 pr-4">Name</th>
                  <th className="text-left text-[10px] font-bold text-[#9197B3] pb-3 pr-4 w-32">Popularity</th>
                  <th className="text-left text-[10px] font-bold text-[#9197B3] pb-3 w-16">Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F2F7]">
                {projects.map((proj) => (
                  <tr key={proj.id} className="hover:bg-[#F3F2F7]/30 transition-colors">
                    <td className="py-3 pr-4 text-[11px] font-bold text-[#9197B3]">{proj.id}</td>
                    <td className="py-3 pr-4 text-[11px] font-medium text-[#727FE5]">{proj.name}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[#F3F2F7] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${proj.popularity}%`,
                              background: `linear-gradient(to right, #848FE1, #3F467F)`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="px-2.5 py-1 bg-[#F3F2F7] text-[#333366] text-[10px] font-bold rounded-[6px]">
                        {proj.sales}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Credit Card */}
        <div className="lg:col-span-5">
          <div className="relative rounded-[24px] overflow-hidden bg-gradient-to-br from-[#3F467F] to-[#1a1f4a] p-6 h-full min-h-[200px] shadow-xl flex flex-col justify-between">
            {/* Background circles */}
            <div className="absolute bottom-[-30px] right-[-30px] w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute bottom-[20px] right-[20px] w-32 h-32 rounded-full bg-white/5" />

            <div className="relative z-10 flex justify-between items-start">
              <div>
                <p className="text-white/60 text-[11px] font-medium mb-1">Current Balance</p>
                <p className="text-white text-3xl font-bold tracking-wider">40,871</p>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-[#848FE1] opacity-80 -mr-3" />
                <div className="w-8 h-8 rounded-full bg-[#9197B3] opacity-60" />
              </div>
            </div>

            <div className="relative z-10 mt-6">
              <p className="text-white/50 text-[11px] font-mono tracking-widest mb-3">
                5282 3456 7890 1289
              </p>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-[10px]">mastercard</span>
                <span className="text-white/60 text-[11px] font-medium">09/25</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
