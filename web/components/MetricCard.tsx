'use client'

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: string
  iconColor: string
}

export default function MetricCard({ title, value, subtitle, icon, iconColor }: MetricCardProps) {
  return (
    <div className="bg-white/95 border border-indigo-100 rounded-xl overflow-hidden shadow-sm hover:shadow transition-shadow">
      <div className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex-shrink-0 w-11 h-11 ${iconColor} rounded-lg flex items-center justify-center shadow-sm`}>
            <span className="text-white text-lg leading-none">{icon}</span>
          </div>
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-medium text-indigo-600 uppercase tracking-wider truncate">
              {title}
            </dt>
            <dd className="mt-1 flex items-baseline flex-wrap gap-x-2">
              <span className="text-xl font-semibold text-indigo-900 tabular-nums">
                {value}
              </span>
              {subtitle && (
                <span className="text-sm text-teal-600">
                  {subtitle}
                </span>
              )}
            </dd>
          </div>
        </div>
      </div>
    </div>
  )
}
