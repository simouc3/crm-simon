export function DashboardSkeleton() {
  return (
    <div className="p-6 md:p-10 space-y-10 max-w-7xl mx-auto font-sans pb-24 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-end justify-between py-10 mb-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-8 rounded-full bg-slate-200 dark:bg-white/10" />
            <div className="h-3 w-24 bg-slate-200 dark:bg-white/10 rounded-full" />
          </div>
          <div className="h-16 w-64 md:w-96 bg-slate-200 dark:bg-white/10 rounded-3xl" />
          
          <div className="flex bg-slate-200 dark:bg-white/5 p-1.5 rounded-full mt-6 w-fit">
            <div className="h-10 w-28 bg-white dark:bg-white/5 rounded-full" />
            <div className="h-10 w-28 bg-transparent rounded-full" />
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-4 mt-12 md:mt-0">
          <div className="h-11 w-48 bg-slate-200 dark:bg-white/5 rounded-full" />
          <div className="flex gap-3">
            <div className="h-11 w-24 bg-slate-200 dark:bg-white/5 rounded-full" />
            <div className="h-11 w-24 bg-slate-200 dark:bg-white/5 rounded-full" />
          </div>
        </div>
      </div>

      {/* KPI Cards Skeleton */}
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-44 rounded-[28px] bg-slate-100 dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.03]" />
        ))}
      </div>

      {/* Large Widget Skeleton */}
      <div className="h-[500px] rounded-[32px] bg-slate-100 dark:bg-white/[0.03] border border-black/[0.03] dark:border-white/[0.03]" />

      {/* Grid Sections Skeleton */}
      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="h-20 w-3/4 bg-slate-200 dark:bg-white/10 rounded-2xl" />
          <div className="h-[300px] rounded-[32px] bg-slate-100 dark:bg-white/[0.03]" />
        </div>
        <div className="space-y-6">
          <div className="h-20 w-3/4 bg-slate-200 dark:bg-white/10 rounded-2xl" />
          <div className="h-[300px] rounded-[32px] bg-slate-100 dark:bg-white/[0.03]" />
        </div>
      </div>
    </div>
  )
}
