// pages/trips.tsx

'use client'

import { useState } from 'react'
import {
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
  MapPin,
  Route,
  Clock,
  Target,
  Navigation,
  Car,
  BarChart3,
  Activity
} from 'lucide-react'

import NewTripForm from './newTripForm'
import TripMap from './tripMap'

type Coords = {
  lat: number
  lng: number
}

type Props = {
  language?: 'en' | 'es'
}

type TripStep = {
  amount: number
  desc: string
  date: string
  type: 'income' | 'expense'
  receiptUrl?: string
}

type Trip = {
  id: string
  name: string
  date: string
  income: number
  expenses: number
  incomeBreakdown: TripStep[]
  expensesBreakdown: TripStep[]
  startCoords?: Coords
  endCoords?: Coords
  distance?: number
  duration?: number
  company: string
  paymentType: 'full' | 'installments'
  totalAmount: number
  installments?: { amount: number; date: string }[]
}

const TripsPage = ({ language = 'en' }: Props) => {
  const t = {
    en: {
      title: 'Trips Overview',
      tripName: 'Trip',
      date: 'Date',
      income: 'Income',
      expenses: 'Expenses',
      profit: 'Profit',
      noTrips: 'No trips found.',
      add: 'Add Trip',
      incomeDetails: 'Income Details',
      expenseDetails: 'Expense Details',
      close: 'Close',
      routeMap: 'Trip Route',
      distance: 'Distance',
      duration: 'Duration',
      km: 'km',
      hours: 'hrs',
      startLocation: 'Start',
      endLocation: 'End',
      tripDetails: 'Trip Details',
      financialSummary: 'Financial Summary',
      totalIncome: 'Total Income',
      totalExpenses: 'Total Expenses',
      totalProfit: 'Total Profit',
      totalDistance: 'Total Distance',
      avgProfit: 'Avg Profit per Trip',
      tripSteps: 'Trip Steps',
      viewReceipt: 'View Receipt',
      getStarted: 'Click "Add Trip" to get started',
      paymentDetails: 'Payment Details',
      paidInFull: 'Paid in Full',
      installmentPlan: 'Installment Plan',
      installmentsDue: 'Installments Due',
      dueDate: 'Due Date',
      company: 'Company'
    },
    es: {
      title: 'Resumen de Viajes',
      tripName: 'Viaje',
      date: 'Fecha',
      income: 'Ingresos',
      expenses: 'Gastos',
      profit: 'Ganancia',
      noTrips: 'No se encontraron viajes.',
      add: 'Agregar Viaje',
      incomeDetails: 'Detalles de Ingresos',
      expenseDetails: 'Detalles de Gastos',
      close: 'Cerrar',
      routeMap: 'Ruta del Viaje',
      distance: 'Distancia',
      duration: 'Duración',
      km: 'km',
      hours: 'hrs',
      startLocation: 'Inicio',
      endLocation: 'Destino',
      tripDetails: 'Detalles del Viaje',
      financialSummary: 'Resumen Financiero',
      totalIncome: 'Ingresos Totales',
      totalExpenses: 'Gastos Totales',
      totalProfit: 'Ganancia Total',
      totalDistance: 'Distancia Total',
      avgProfit: 'Ganancia Promedio por Viaje',
      tripSteps: 'Pasos del Viaje',
      viewReceipt: 'Ver Recibo',
      getStarted: 'Haz clic en "Agregar Viaje" para comenzar',
      paymentDetails: 'Detalles de Pago',
      paidInFull: 'Pago Total',
      installmentPlan: 'Plan de Cuotas',
      installmentsDue: 'Cuotas Pendientes',
      dueDate: 'Fecha de Vencimiento',
      company: 'Empresa'
    }
  }

  const text = t[language]
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([
    {
      id: '1',
      name: 'Bogotá to Medellín',
      date: '2024-03-15',
      company: 'TransColombia S.A.S',
      paymentType: 'installments' as const,
      totalAmount: 1200,
      installments: [
        { amount: 600, date: '2024-03-20' },
        { amount: 600, date: '2024-04-20' }
      ],
      income: 1200,
      expenses: 680,
      incomeBreakdown: [
        {
          amount: 800,
          desc: 'Delivery fee',
          date: '2024-03-15',
          type: 'income',
          receiptUrl: 'https://example.com/receipt1.pdf'
        },
        {
          amount: 400,
          desc: 'Additional load',
          date: '2024-03-15',
          type: 'income'
        }
      ],
      expensesBreakdown: [
        {
          amount: 200,
          desc: 'Gas',
          date: '2024-03-15',
          type: 'expense'
        },
        {
          amount: 180,
          desc: 'Food',
          date: '2024-03-15',
          type: 'expense',
          receiptUrl: 'https://example.com/receipt2.pdf'
        },
        {
          amount: 300,
          desc: 'Toll',
          date: '2024-03-15',
          type: 'expense'
        }
      ],
      startCoords: { lat: 4.710989, lng: -74.072092 },
      endCoords: { lat: 6.244203, lng: -75.581215 },
      distance: 415,
      duration: 6.5
    },
    {
      id: '2',
      name: 'Cali to Barranquilla',
      date: '2024-04-02',
      company: 'Logistics Plus',
      paymentType: 'full' as const,
      totalAmount: 1500,
      income: 1500,
      expenses: 850,
      incomeBreakdown: [
        {
          amount: 1500,
          desc: 'Direct transport',
          date: '2024-04-02',
          type: 'income'
        }
      ],
      expensesBreakdown: [
        {
          amount: 500,
          desc: 'Fuel',
          date: '2024-04-02',
          type: 'expense'
        },
        {
          amount: 350,
          desc: 'Lodging & food',
          date: '2024-04-02',
          type: 'expense'
        }
      ],
      startCoords: { lat: 3.45164, lng: -76.53198 },
      endCoords: { lat: 10.963889, lng: -74.793611 },
      distance: 1052,
      duration: 12
    }
  ])

  const handleAddTrip = (trip: {
    id: string
    name: string
    date: string
    company: string
    paymentType: 'full' | 'installments'
    totalAmount: number
    installments?: { amount: number; date: string }[]
    income: number
    expenses: number
    incomeBreakdown: TripStep[]
    expensesBreakdown: TripStep[]
    startCoords?: Coords
    endCoords?: Coords
    distance?: number
    duration?: number
  }) => {
    setTrips((prev) => [...prev, trip])
  }

  const totalStats = trips.reduce(
    (acc, trip) => ({
      totalIncome: acc.totalIncome + trip.income,
      totalExpenses: acc.totalExpenses + trip.expenses,
      totalProfit: acc.totalProfit + (trip.income - trip.expenses),
      totalDistance: acc.totalDistance + (trip.distance || 0)
    }),
    { totalIncome: 0, totalExpenses: 0, totalProfit: 0, totalDistance: 0 }
  )

  const avgProfit = trips.length > 0 ? totalStats.totalProfit / trips.length : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header with Add Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{text.title}</h1>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            {text.add}
          </button>
        </div>

        {/* Stats Cards */}
        {trips.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{text.totalProfit}</p>
                  <p className={`text-lg sm:text-2xl font-bold ${totalStats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${totalStats.totalProfit.toFixed(0)}
                  </p>
                </div>
                <div className={`p-2 sm:p-3 rounded-full ${totalStats.totalProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <BarChart3 className={`w-4 h-4 sm:w-6 sm:h-6 ${totalStats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{text.totalDistance}</p>
                  <p className="text-lg sm:text-2xl font-bold text-blue-600">{totalStats.totalDistance.toFixed(0)} km</p>
                </div>
                <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                  <Route className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{text.avgProfit}</p>
                  <p className={`text-lg sm:text-2xl font-bold ${avgProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    ${avgProfit.toFixed(0)}
                  </p>
                </div>
                <div className={`p-2 sm:p-3 rounded-full ${avgProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  <Activity className={`w-4 h-4 sm:w-6 sm:h-6 ${avgProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 sm:p-6 shadow-lg border border-gray-200/50 hover:shadow-xl transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{text.totalIncome}</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">${totalStats.totalIncome.toFixed(0)}</p>
                </div>
                <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                  <DollarSign className="w-4 h-4 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 flex items-center justify-center shadow-inner">
              <Car className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">{text.noTrips}</h3>
            <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto">{text.getStarted}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {trips.map((trip) => {
              const profit = trip.income - trip.expenses
              const profitColor = profit >= 0 ? 'text-emerald-600' : 'text-red-600'
              const profitBg = profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'
              const profitBorder = profit >= 0 ? 'border-emerald-200' : 'border-red-200'

              return (
                <div
                  key={trip.id}
                  onClick={() => setSelectedTrip(trip)}
                  className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 sm:p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 hover:border-blue-300/50 active:scale-95 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 truncate group-hover:text-blue-600 transition-colors">
                        {trip.name}
                      </h2>
                      <span className="text-xs sm:text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> {trip.date}
                      </span>
                      {trip.company && (
                        <span className="text-xs text-gray-400 block mt-1">{trip.company}</span>
                      )}
                    </div>
                    <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium border ${profitBg} ${profitColor} ${profitBorder}`}>
                      {profit >= 0 ? '+' : ''}${profit.toFixed(0)}
                    </div>
                  </div>

                  {/* Trip info */}
                  <div className="space-y-2 sm:space-y-3 mb-4">
                    {trip.distance && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                        <Navigation className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                        <span>{trip.distance} {text.km}</span>
                        {trip.duration && (
                          <>
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 ml-2 text-orange-500" />
                            <span>{trip.duration} {text.hours}</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Financial summary */}
                  <div className="space-y-2 text-xs sm:text-sm bg-gray-50/50 rounded-lg p-3 sm:p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">{text.income}</span>
                      <span className="font-semibold text-green-600 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" /> {trip.income.toFixed(0)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">{text.expenses}</span>
                      <span className="font-semibold text-red-600 flex items-center gap-1">
                        <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" /> {trip.expenses.toFixed(0)}
                      </span>
                    </div>

                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-700">{text.profit}</span>
                        <span className={`font-bold ${profitColor} flex items-center gap-1`}>
                          {profit >= 0 ? (
                            <ArrowUpRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                          ${profit.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Enhanced Trip Details Modal */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-4 sm:p-6 flex justify-between items-center">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{selectedTrip.name}</h2>
                <p className="text-gray-600 flex items-center gap-1 mt-1 text-sm">
                  <Calendar className="w-4 h-4" /> {selectedTrip.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-4"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Map Section */}
                {selectedTrip.startCoords && selectedTrip.endCoords && (
                  <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      {text.routeMap}
                    </h3>
                    <div className="bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                      <TripMap start={selectedTrip.startCoords} end={selectedTrip.endCoords} />
                    </div>
                  </div>
                )}

                {/* Trip Info */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6 border border-blue-200/50">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-blue-600" />
                    {text.tripDetails}
                  </h3>
                  <div className="space-y-3 text-sm">
                    {selectedTrip.distance && (
                      <div className="flex justify-between items-center py-2 border-b border-blue-200/30">
                        <span className="text-gray-600 font-medium">{text.distance}:</span>
                        <span className="font-semibold text-blue-700">{selectedTrip.distance} {text.km}</span>
                      </div>
                    )}
                    {selectedTrip.duration && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 font-medium">{text.duration}:</span>
                        <span className="font-semibold text-blue-700">{selectedTrip.duration} {text.hours}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 sm:p-6 border border-green-200/50">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    {text.financialSummary}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-green-200/30">
                      <span className="text-gray-600 font-medium">{text.income}:</span>
                      <span className="font-semibold text-green-700">${selectedTrip.income.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-green-200/30">
                      <span className="text-gray-600 font-medium">{text.expenses}:</span>
                      <span className="font-semibold text-red-600">${selectedTrip.expenses.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="font-medium text-gray-700">{text.profit}:</span>
                      <span className={`font-bold text-lg ${(selectedTrip.income - selectedTrip.expenses) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        ${(selectedTrip.income - selectedTrip.expenses).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Details Section - MOVED TO MODAL */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-4 sm:p-6 border border-amber-200/50">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-600" />
                    {text.paymentDetails}
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center py-2 border-b border-amber-200/30">
                      <span className="text-gray-600 font-medium">{text.company}:</span>
                      <span className="font-semibold text-amber-700">{selectedTrip.company || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600 font-medium">Type:</span>
                      <span className="font-semibold text-amber-700">
                        {selectedTrip.paymentType === 'full' ? text.paidInFull : text.installmentPlan}
                      </span>
                    </div>
                    
                    {selectedTrip.paymentType === 'installments' && selectedTrip.installments && (
                      <div className="mt-4 pt-3 border-t border-amber-200/30">
                        <h4 className="font-medium text-gray-700 mb-3">{text.installmentsDue}:</h4>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {selectedTrip.installments.map((installment, idx) => (
                            <div key={idx} className="flex justify-between items-center py-1 px-2 bg-white/50 rounded text-xs">
                              <span>#{idx + 1} - {text.dueDate}: {installment.date}</span>
                              <span className="font-semibold">${installment.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Trip Timeline */}
                <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 lg:col-span-2 shadow-sm">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-purple-600" />
                    {text.tripSteps}
                  </h3>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {[...selectedTrip.incomeBreakdown, ...selectedTrip.expensesBreakdown]
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((step, idx) => (
                        <div key={idx} className="flex justify-between items-start border-l-4 pl-4 py-2 hover:bg-gray-50 rounded-r-lg transition-colors"
                          style={{
                            borderColor: step.type === 'income' ? '#16a34a' : '#dc2626'
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${step.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {step.desc}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{step.date}</p>
                            {step.receiptUrl && (
                              <a
                                href={step.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 block transition-colors"
                              >
                                {text.viewReceipt}
                              </a>
                            )}
                          </div>
                          <span className={`font-semibold text-sm ml-4 ${step.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            ${step.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Trip Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <NewTripForm
            onClose={() => setShowNewModal(false)}
            onSave={handleAddTrip}
            language={language}
          />
        </div>
      )}
    </div>
  )
}

export default TripsPage