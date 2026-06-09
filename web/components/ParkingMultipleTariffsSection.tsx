'use client'

import { formatCLP } from '@/lib/utils/currency'

export type TariffPlanForm = {
  id?: string
  name: string
  pricingMode: 'per_minute' | 'per_segment'
  pricePerMinute: string
  segmentAmount: string
  segmentMinutes: string
  maxDailyAmount: string
  minimumStayHours: string
  minimumAmount: string
}

export const emptyTariffPlan = (): TariffPlanForm => ({
  name: '',
  pricingMode: 'per_minute',
  pricePerMinute: '',
  segmentAmount: '',
  segmentMinutes: '',
  maxDailyAmount: '',
  minimumStayHours: '0',
  minimumAmount: '',
})

interface ParkingMultipleTariffsSectionProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  plans: TariffPlanForm[]
  onPlansChange: (plans: TariffPlanForm[]) => void
}

export default function ParkingMultipleTariffsSection({
  enabled,
  onEnabledChange,
  plans,
  onPlansChange,
}: ParkingMultipleTariffsSectionProps) {
  const updatePlan = (index: number, patch: Partial<TariffPlanForm>) => {
    onPlansChange(plans.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const addPlan = () => onPlansChange([...plans, emptyTariffPlan()])

  const removePlan = (index: number) => {
    if (plans.length <= 1) return
    onPlansChange(plans.filter((_, i) => i !== index))
  }

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">Tarifa múltiple</h3>
        <button
          type="button"
          onClick={() => onEnabledChange(!enabled)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            enabled
              ? 'bg-indigo-600 text-white hover:bg-indigo-700'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {enabled ? 'Activada' : 'Desactivada'}
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Si está activa, al ingresar un vehículo el operador elige la tarifa (Auto, Camión, Van, etc.).
        Si está desactivada, se usa la tarifa única del parking como hasta ahora.
      </p>

      {enabled && (
        <div className="space-y-4">
          {plans.map((plan, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800">Tarifa {index + 1}</span>
                {plans.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePlan(index)}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Eliminar
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required={enabled}
                  value={plan.name}
                  onChange={(e) => updatePlan(index, { name: e.target.value })}
                  placeholder="Ej: Auto, Camión, Van"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de tarifa *</label>
                <select
                  value={plan.pricingMode}
                  onChange={(e) =>
                    updatePlan(index, { pricingMode: e.target.value as 'per_minute' | 'per_segment' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="per_minute">Por minuto</option>
                  <option value="per_segment">Por tramo</option>
                </select>
              </div>

              {plan.pricingMode === 'per_minute' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio por minuto (CLP) *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required={enabled}
                    value={plan.pricePerMinute}
                    onChange={(e) => updatePlan(index, { pricePerMinute: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto por tramo *</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={plan.segmentAmount}
                      onChange={(e) => updatePlan(index, { segmentAmount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Minutos por tramo *</label>
                    <input
                      type="number"
                      min="1"
                      value={plan.segmentMinutes}
                      onChange={(e) => updatePlan(index, { segmentMinutes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estadía mínima (horas)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={plan.minimumStayHours}
                    onChange={(e) => updatePlan(index, { minimumStayHours: e.target.value })}
                    placeholder="0 = sin mínimo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto mínimo (CLP)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={plan.minimumAmount}
                    onChange={(e) => updatePlan(index, { minimumAmount: e.target.value })}
                    placeholder="Vacío = sin monto mínimo"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              {(parseFloat(plan.minimumStayHours || '0') > 0 || plan.minimumAmount) && (
                <p className="text-xs text-gray-500">
                  {parseFloat(plan.minimumStayHours || '0') > 0 && plan.minimumAmount
                    ? `Las primeras ${plan.minimumStayHours} h se cobran siempre ${formatCLP(parseFloat(plan.minimumAmount))}; luego cada minuto adicional.`
                    : parseFloat(plan.minimumStayHours || '0') > 0
                    ? `Mínimo ${plan.minimumStayHours} h de estadía.`
                    : ''}
                </p>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tope máximo diario (CLP)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={plan.maxDailyAmount}
                  onChange={(e) => updatePlan(index, { maxDailyAmount: e.target.value })}
                  placeholder="Vacío = sin tope"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addPlan}
            className="w-full py-2 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-md hover:bg-indigo-50 text-sm font-medium"
          >
            + Agregar tarifa
          </button>
        </div>
      )}
    </div>
  )
}
