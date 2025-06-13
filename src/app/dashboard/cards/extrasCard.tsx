import React, { useState } from "react";
import { Plus, Battery, Droplets, X, Calendar, DollarSign, FileText, CreditCard, Fuel, Clock } from "lucide-react";

type Extra = {
  id: string;
  vehicleId: string;
  type: string;
  brand: string;
  purchaseDate: string;
  cost: number;
  notes?: string;
};

type PopupData = {
  type: string;
  brand: string;
  purchaseDate: string;
  cost: number;
  notes?: string;
} | null;

type NewRecordData = {
  type: string;
  brand: string;
  purchaseDate: string;
  cost: string;
  notes: string;
};

interface ExtrasCardProps {
  vehicleId: string;
  extras: Extra[];
  isLoading: boolean;
  onCreateExtra: (vehicleId: string, extraData: Omit<Extra, 'id' | 'vehicleId'>) => Promise<Extra>;
}

const ExtrasCard: React.FC<ExtrasCardProps> = ({
  vehicleId,
  extras,
  isLoading,
  onCreateExtra
}) => {
  const [popupData, setPopupData] = useState<PopupData>(null);
  const [popupType, setPopupType] = useState<string>('');
  const [isNewRecordOpen, setIsNewRecordOpen] = useState(false);
  const [newRecordData, setNewRecordData] = useState<NewRecordData>({
    type: 'bateria',
    brand: '',
    purchaseDate: '',
    cost: '',
    notes: ''
  });

  const getMaintenanceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bateria':
      case 'battery':
        return <Battery size={20} />;
      case 'lubricante':
      case 'lubricant':
        return <Droplets size={20} />;
      case 'gasolina':
        return <Fuel size={20} />;
      case 'peaje':
        return <CreditCard size={20} />;
      default:
        return <FileText size={20} />;
    }
  };

  const getMaintenanceColors = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bateria':
      case 'battery':
        return {
          bg: 'bg-green-500',
          gradient: 'from-green-50 to-green-100',
          border: 'border-green-200',
          text: 'text-green-900',
          textSecondary: 'text-green-700'
        };
      case 'lubricante':
      case 'lubricant':
        return {
          bg: 'bg-orange-500',
          gradient: 'from-orange-50 to-orange-100',
          border: 'border-orange-200',
          text: 'text-orange-900',
          textSecondary: 'text-orange-700'
        };
      case 'gasolina':
        return {
          bg: 'bg-red-500',
          gradient: 'from-red-50 to-red-100',
          border: 'border-red-200',
          text: 'text-red-900',
          textSecondary: 'text-red-700'
        };
      case 'peaje':
        return {
          bg: 'bg-purple-500',
          gradient: 'from-purple-50 to-purple-100',
          border: 'border-purple-200',
          text: 'text-purple-900',
          textSecondary: 'text-purple-700'
        };
      default:
        return {
          bg: 'bg-gray-500',
          gradient: 'from-gray-50 to-gray-100',
          border: 'border-gray-200',
          text: 'text-gray-900',
          textSecondary: 'text-gray-700'
        };
    }
  };

  const getExtrasByType = (type: string) => {
    return extras
      .filter(extra => extra.type.toLowerCase() === type.toLowerCase())
      .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  };

  const getLatestExtraByType = (type: string) => {
    const typeExtras = getExtrasByType(type);
    return typeExtras[0];
  };

  const handleItemClick = (item: Extra) => {
    setPopupData({
      type: item.type,
      brand: item.brand,
      purchaseDate: item.purchaseDate,
      cost: item.cost,
      notes: item.notes
    });
    setPopupType(item.type);
  };

  const closePopup = () => {
    setPopupData(null);
    setPopupType('');
  };

  const handleNewRecordSubmit = async () => {
    if (!newRecordData.brand || !newRecordData.purchaseDate || !newRecordData.cost) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      await onCreateExtra(vehicleId, {
        type: newRecordData.type,
        brand: newRecordData.brand,
        purchaseDate: newRecordData.purchaseDate,
        cost: parseFloat(newRecordData.cost),
        notes: newRecordData.notes || undefined
      });

      // Reset form and close modal
      setNewRecordData({
        type: 'bateria',
        brand: '',
        purchaseDate: '',
        cost: '',
        notes: ''
      });
      setIsNewRecordOpen(false);
    } catch (err) {
      console.error('Error creating extra:', err);
      alert('Error al crear el registro. Por favor intente de nuevo.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderMaintenanceBox = (type: string, label: string) => {
    const item = getLatestExtraByType(type);
    const colors = getMaintenanceColors(type);
    
    return item ? (
      <div 
        onClick={() => handleItemClick(item)}
        className={`bg-gradient-to-br ${colors.gradient} border ${colors.border} rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow duration-200`}
      >
        <div className="flex items-center space-x-3">
          <div className={`${colors.bg} text-white p-2 rounded-lg`}>
            {getMaintenanceIcon(type)}
          </div>
          <div>
            <h3 className={`font-semibold ${colors.text} text-sm`}>{label}</h3>
            <p className={`${colors.textSecondary} font-bold text-base`}>
              {item.brand}
            </p>
          </div>
        </div>
      </div>
    ) : (
      <div className={`bg-gradient-to-br ${colors.gradient} border ${colors.border} rounded-xl p-4 shadow-sm opacity-50`}>
        <div className="flex items-center space-x-3">
          <div className={`${colors.bg} text-white p-2 rounded-lg`}>
            {getMaintenanceIcon(type)}
          </div>
          <div>
            <h3 className={`font-semibold ${colors.text} text-sm`}>{label}</h3>
            <p className={`${colors.textSecondary} text-sm`}>Sin registros</p>
          </div>
        </div>
      </div>
    );
  };

  const renderHistoricItem = (item: Extra, isLatest: boolean) => {
    const colors = getMaintenanceColors(item.type);
    
    return (
      <div key={item.id} className={`border ${colors.border} rounded-lg p-4 ${isLatest ? 'ring-2 ring-blue-200 bg-blue-50' : 'bg-gray-50'}`}>
        {isLatest && (
          <div className="flex items-center space-x-1 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs font-medium text-blue-700">Más reciente</span>
          </div>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`${colors.bg} text-white p-2 rounded-lg`}>
                {getMaintenanceIcon(item.type)}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{item.brand}</h4>
                <p className="text-sm text-gray-600">Marca/Proveedor</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatCurrency(item.cost)}</p>
              <p className="text-sm text-gray-600">{formatDateShort(item.purchaseDate)}</p>
            </div>
          </div>

          {item.notes && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-start space-x-2">
                <FileText size={14} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-600 mb-1">Notas</p>
                  <p className="text-sm text-gray-900">{item.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Additional Maintenance Boxes */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Battery Box */}
        {renderMaintenanceBox('bateria', 'Batería')}
        
        {/* Lubricant Box */}
        {renderMaintenanceBox('lubricante', 'Lubricante')}
        
        {/* Gasolina Box */}
        {renderMaintenanceBox('gasolina', 'Gasolina')}
        
        {/* Peaje Box */}
        {renderMaintenanceBox('peaje', 'Peaje')}
      </div>

      {/* Loading indicator for extras */}
      {isLoading && (
        <div className="mt-4 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#173D68]"></div>
        </div>
      )}

      {/* Nuevo Registro Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={() => setIsNewRecordOpen(true)}
          className="bg-[#1E76B6] hover:bg-[#348CCB] text-white px-6 py-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 font-semibold shadow-sm hover:shadow-md"
          disabled={isLoading}
        >
          <Plus size={18} />
          <span>Nuevo Registro</span>
        </button>
      </div>

      {/* Maintenance Item Popup with Historic Section */}
      {popupData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-white border-b border-gray-200 p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {popupData.type}
                </h3>
                <button
                  onClick={closePopup}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto">
              {/* Current/Latest Item Section */}
              <div className="p-4 border-b border-gray-100">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>Información Actual</span>
                </h4>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className={`${getMaintenanceColors(popupData.type).bg} text-white p-3 rounded-lg`}>
                      {getMaintenanceIcon(popupData.type)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{popupData.brand}</h4>
                      <p className="text-sm text-gray-600">Marca/Proveedor</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <Calendar size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Fecha de compra</p>
                        <p className="font-medium text-gray-900">{formatDate(popupData.purchaseDate)}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <DollarSign size={16} className="text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">Costo</p>
                        <p className="font-medium text-gray-900">{formatCurrency(popupData.cost)}</p>
                      </div>
                    </div>
                  </div>

                  {popupData.notes && (
                    <div className="flex items-start space-x-3">
                      <FileText size={16} className="text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600">Notas</p>
                        <p className="font-medium text-gray-900">{popupData.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Historic Section */}
              <div className="p-4">
                <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Clock size={16} />
                  <span>Historial</span>
                  <span className="text-sm font-normal text-gray-500">
                    ({getExtrasByType(popupType).length} registro{getExtrasByType(popupType).length !== 1 ? 's' : ''})
                  </span>
                </h4>
                
                <div className="space-y-3">
                  {getExtrasByType(popupType).length > 0 ? (
                    getExtrasByType(popupType).map((item, index) => 
                      renderHistoricItem(item, index === 0)
                    )
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock size={24} className="mx-auto mb-2 opacity-50" />
                      <p>No hay registros históricos</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Record Modal */}
      {isNewRecordOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 max-h-96 overflow-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Nuevo Registro
                </h3>
                <button
                  onClick={() => setIsNewRecordOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={newRecordData.type}
                  onChange={(e) => setNewRecordData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent"
                >
                  <option value="bateria">Batería</option>
                  <option value="lubricante">Lubricante</option>
                  <option value="gasolina">Gasolina</option>
                  <option value="peaje">Peaje</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca/Proveedor *
                </label>
                <input
                  type="text"
                  value={newRecordData.brand}
                  onChange={(e) => setNewRecordData(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent"
                  placeholder="Ingrese la marca o proveedor"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de compra *
                </label>
                <input
                  type="date"
                  value={newRecordData.purchaseDate}
                  onChange={(e) => setNewRecordData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Costo *
                </label>
                <input
                  type="number"
                  value={newRecordData.cost}
                  onChange={(e) => setNewRecordData(prev => ({ ...prev, cost: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={newRecordData.notes}
                  onChange={(e) => setNewRecordData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E76B6] focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setIsNewRecordOpen(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleNewRecordSubmit}
                  className="flex-1 px-4 py-2 bg-[#1E76B6] hover:bg-[#348CCB] text-white rounded-lg transition-colors duration-200"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ExtrasCard;