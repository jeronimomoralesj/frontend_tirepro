'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
type OpenCageResult = {
  formatted: string
  geometry: {
    lat: number
    lng: number
  }
}

type Props = {
  onClose: () => void
  onSave: (trip: {
    id: string
    name: string
    date: string
    company: string
    paymentType: 'full' | 'installments'
    totalAmount: number
    installments?: { amount: number; date: string }[]
    income: number
    expenses: number
    incomeBreakdown: { amount: number; desc: string }[]
    expensesBreakdown: { amount: number; desc: string }[]
    startCoords?: { lat: number; lng: number }
    endCoords?: { lat: number; lng: number }
  }) => void
  language?: 'en' | 'es'
}

const NewTripForm = ({ onClose, onSave, language = 'en' }: Props) => {
  const t = {
    en: {
      title: 'New Trip',
      name: 'Trip Name',
      date: 'Date',
      company: 'Company',
      payment: 'Payment Type',
      full: 'Paid in Full',
      installments: 'Installments',
      amount: 'Amount',
      howMany: 'Number of Installments',
      installment: 'Installment',
      installmentDate: 'Due Date',
      start: 'Start Location',
      end: 'End Location',
      save: 'Save',
      cancel: 'Cancel',
    },
    es: {
      title: 'Nuevo Viaje',
      name: 'Nombre del Viaje',
      date: 'Fecha',
      company: 'Empresa',
      payment: 'Tipo de Pago',
      full: 'Pago Total',
      installments: 'Cuotas',
      amount: 'Monto',
      howMany: 'Número de Cuotas',
      installment: 'Cuota',
      installmentDate: 'Fecha de Vencimiento',
      start: 'Lugar de Inicio',
      end: 'Lugar de Destino',
      save: 'Guardar',
      cancel: 'Cancelar',
    }
  }

  const text = t[language]

  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [company, setCompany] = useState('')
  const [paymentType, setPaymentType] = useState<'full' | 'installments'>('full')
  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [installmentCount, setInstallmentCount] = useState(2)
  const [installments, setInstallments] = useState<{ amount: number; date: string }[]>([
    { amount: 0, date: '' },
    { amount: 0, date: '' }
  ])

  const [startQuery, setStartQuery] = useState('')
  const [endQuery, setEndQuery] = useState('')
  const [startCoords, setStartCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [endCoords, setEndCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [startSuggestions, setStartSuggestions] = useState<OpenCageResult[]>([])
  const [endSuggestions, setEndSuggestions] = useState<OpenCageResult[]>([])

  const API_KEY = process.env.NEXT_PUBLIC_OPENCAGE_KEY

  const fetchSuggestions = async (
  query: string,
  setter: (data: OpenCageResult[]) => void
) => {
  if (!query || query.length < 3 || !API_KEY) return

  const res = await fetch(
    `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
      query
    )}&key=${API_KEY}&limit=5&language=${language}`
  )

  const data: { results: OpenCageResult[] } = await res.json()
  setter(data.results || [])
}

  useEffect(() => {
    const timeout = setTimeout(() => fetchSuggestions(startQuery, setStartSuggestions), 500)
    return () => clearTimeout(timeout)
  }, [startQuery])

  useEffect(() => {
    const timeout = setTimeout(() => fetchSuggestions(endQuery, setEndSuggestions), 500)
    return () => clearTimeout(timeout)
  }, [endQuery])

  useEffect(() => {
    setInstallments(Array(installmentCount).fill(null).map(() => ({ amount: 0, date: '' })))
  }, [installmentCount])

  const handleInstallmentChange = (idx: number, field: 'amount' | 'date', value: string | number) => {
    const newInstallments = [...installments]
    newInstallments[idx] = {
      ...newInstallments[idx],
      [field]: value
    }
    setInstallments(newInstallments)
  }

  const handleSubmit = () => {
    if (!startCoords || !endCoords) return

    const tripData = {
      id: Date.now().toString(),
      name,
      date,
      company,
      paymentType,
      totalAmount: paymentType === 'full' ? totalAmount : installments.reduce((a, b) => a + b.amount, 0),
      installments: paymentType === 'installments' ? installments : undefined,
      income: 0,
      expenses: 0,
      incomeBreakdown: [],
      expensesBreakdown: [],
      startCoords,
      endCoords
    }

    onSave(tripData)
    onClose()
  }

  const isFormValid = () => {
    if (!name || !date || !company || !startCoords || !endCoords) return false
    
    if (paymentType === 'full') {
      return totalAmount > 0
    } else {
      return installments.every(inst => inst.amount > 0 && inst.date)
    }
  }

  return (
    <div className="fixed inset-0 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-xl relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-gray-500 hover:text-gray-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 pr-8">{text.title}</h2>

        <div className="space-y-4">
          {/* Trip Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{text.name}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={text.name}
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{text.date}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{text.company}</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={text.company}
            />
          </div>

          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{text.payment}</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value as 'full' | 'installments')}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="full">{text.full}</option>
              <option value="installments">{text.installments}</option>
            </select>
          </div>

          {/* Payment Details */}
          {paymentType === 'full' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{text.amount}</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{text.howMany}</label>
                <input
                  type="number"
                  value={installmentCount}
                  min={1}
                  max={12}
                  onChange={(e) => setInstallmentCount(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="2"
                />
              </div>
              
              <div className="space-y-3">
                {installments.map((inst, idx) => (
                  <div key={idx} className="p-3 border rounded-lg bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      {text.installment} {idx + 1}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {text.amount}
                        </label>
                        <input
                          type="number"
                          value={inst.amount}
                          onChange={(e) => handleInstallmentChange(idx, 'amount', Number(e.target.value))}
                          className="w-full border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          {text.installmentDate}
                        </label>
                        <input
                          type="date"
                          value={inst.date}
                          onChange={(e) => handleInstallmentChange(idx, 'date', e.target.value)}
                          className="w-full border rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Start Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{text.start}</label>
            <input
              type="text"
              value={startQuery}
              onChange={(e) => {
                setStartQuery(e.target.value)
                setStartCoords(null)
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={text.start}
            />
            {startSuggestions.length > 0 && (
              <ul className="mt-2 border rounded-md shadow-sm bg-white max-h-40 overflow-y-auto text-sm z-10 relative">
                {startSuggestions.map((s, idx) => (
                  <li
                    key={idx}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setStartQuery(s.formatted)
                      setStartCoords({ lat: s.geometry.lat, lng: s.geometry.lng })
                      setStartSuggestions([])
                    }}
                  >
                    {s.formatted}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* End Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{text.end}</label>
            <input
              type="text"
              value={endQuery}
              onChange={(e) => {
                setEndQuery(e.target.value)
                setEndCoords(null)
              }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={text.end}
            />
            {endSuggestions.length > 0 && (
              <ul className="mt-2 border rounded-md shadow-sm bg-white max-h-40 overflow-y-auto text-sm z-10 relative">
                {endSuggestions.map((s, idx) => (
                  <li
                    key={idx}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                    onClick={() => {
                      setEndQuery(s.formatted)
                      setEndCoords({ lat: s.geometry.lat, lng: s.geometry.lng })
                      setEndSuggestions([])
                    }}
                  >
                    {s.formatted}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-sm text-gray-600 hover:text-gray-800 order-2 sm:order-1"
          >
            {text.cancel}
          </button>
          <button
            onClick={handleSubmit}
            className="w-full sm:w-auto px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed order-1 sm:order-2"
            disabled={!isFormValid()}
          >
            {text.save}
          </button>
        </div>
      </div>
    </div>
  )
}

export default NewTripForm