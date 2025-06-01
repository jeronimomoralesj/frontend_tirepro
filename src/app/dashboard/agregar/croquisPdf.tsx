import React from 'react';

interface TireChange {
  id: string;
  marca: string;
  originalPosition: string | null;
  newPosition: string | null;
}

interface Vehicle {
  id: string;
  placa: string;
  tipovhc?: string;
}

interface Tire {
  id: string;
  marca: string;
  position?: string | null;
}

interface CroquisPdfProps {
  vehicle: Vehicle;
  changes: TireChange[];
  allTires: Tire[];
}

const CroquisPdf: React.FC<CroquisPdfProps> = ({ vehicle, changes, allTires }) => {
  const generatePDF = () => {
    // Create a new window for the PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Calculate layout based on tire count
    const assignedTires = allTires.filter(t => t.position && t.position !== "0");
    const tireCount = assignedTires.length || 4;
    const axisCount = tireCount <= 8 ? 2 : tireCount <= 12 ? 3 : Math.ceil(tireCount / 4);
    
    const layout: string[][] = [];
    let positionCounter = 1;

    for (let i = 0; i < axisCount; i++) {
      const tiresPerSide = i === 0 ? 1 : tireCount > 6 && i > 0 ? 2 : 1;
      const axle: string[] = [];
      
      for (let j = 0; j < tiresPerSide * 2; j++) {
        axle.push(positionCounter.toString());
        positionCounter++;
      }
      layout.push(axle);
    }

    // Create tire position map
    const tireMap: Record<string, Tire> = {};
    assignedTires.forEach(t => {
      if (t.position && t.position !== "0") {
        tireMap[t.position] = t;
      }
    });

    // Create change map for arrows
    const changeMap: Record<string, { from: string; to: string; marca: string }> = {};
    changes.forEach(change => {
      if (change.originalPosition && change.newPosition && 
          change.originalPosition !== "0" && change.newPosition !== "0") {
        changeMap[change.newPosition] = {
          from: change.originalPosition,
          to: change.newPosition,
          marca: change.marca
        };
      }
    });

    const currentDate = new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reporte de Rotación - ${vehicle.placa}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 20px;
            position: relative;
            overflow-x: hidden;
          }

          /* Watermark */
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 120px;
            color: rgba(30, 118, 182, 0.1);
            font-weight: bold;
            z-index: -1;
            pointer-events: none;
            user-select: none;
          }

          .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
            position: relative;
          }

          /* Header */
          .header {
            background: linear-gradient(135deg, #0A183A 0%, #173D68 50%, #1E76B6 100%);
            color: white;
            padding: 30px;
            position: relative;
            overflow: hidden;
          }

          .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 200px;
            height: 200px;
            border-radius: 50%;
            background: rgba(255,255,255,0.1);
          }

          .header::after {
            content: '';
            position: absolute;
            bottom: -30%;
            left: -5%;
            width: 150px;
            height: 150px;
            border-radius: 50%;
            background: rgba(255,255,255,0.05);
          }

          .header-content {
            position: relative;
            z-index: 2;
          }

          .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 10px;
            letter-spacing: 2px;
          }

          .subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 20px;
          }

          .report-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }

          .info-card {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 10px;
            border-left: 4px solid #348CCB;
          }

          .info-label {
            font-size: 12px;
            opacity: 0.8;
            margin-bottom: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          .info-value {
            font-size: 16px;
            font-weight: bold;
          }

          /* Main Content */
          .content {
            padding: 40px;
          }

          .section {
            margin-bottom: 40px;
          }

          .section-title {
            font-size: 24px;
            color: #0A183A;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #348CCB;
            position: relative;
          }

          .section-title::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            width: 50px;
            height: 3px;
            background: #1E76B6;
          }

          /* Vehicle Visualization */
          .vehicle-container {
            background: linear-gradient(135deg, #f8f9ff 0%, #e6f2ff 100%);
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            border: 2px solid #348CCB;
            position: relative;
          }

          .vehicle-title {
            text-align: center;
            font-size: 20px;
            color: #0A183A;
            margin-bottom: 30px;
            font-weight: bold;
          }

          .axle-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 40px;
          }

          .axle {
            display: flex;
            align-items: center;
            position: relative;
          }

          .axle-label {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            font-weight: bold;
            color: #173D68;
            background: white;
            padding: 5px 15px;
            border-radius: 20px;
            border: 2px solid #348CCB;
          }

          .axle-end {
            width: 15px;
            height: 20px;
            background: #0A183A;
            border-radius: 8px;
          }

          .axle-end.left {
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
          }

          .axle-end.right {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
          }

          .axle-body {
            height: 25px;
            width: 200px;
            background: linear-gradient(90deg, #0A183A 0%, #1E76B6 50%, #0A183A 100%);
            border-radius: 12px;
            position: relative;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          }

          .axle-body::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 80%;
            height: 8px;
            background: #348CCB;
            border-radius: 4px;
          }

          .tire-side {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .tire-position {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }

          .tire {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: linear-gradient(135deg, #1E76B6 0%, #348CCB 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 11px;
            text-align: center;
            box-shadow: 0 8px 16px rgba(30, 118, 182, 0.3);
            border: 3px solid white;
            position: relative;
            transition: all 0.3s ease;
          }

          .tire.changed {
            background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
            box-shadow: 0 8px 16px rgba(231, 76, 60, 0.4);
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }

          .tire-connector {
            width: 25px;
            height: 4px;
            background: #348CCB;
            border-radius: 2px;
          }

          .position-label {
            font-size: 12px;
            color: #666;
            font-weight: bold;
            background: white;
            padding: 2px 8px;
            border-radius: 10px;
            border: 1px solid #ddd;
          }

          /* Arrow for changes */
          .change-arrow {
            position: absolute;
            top: -15px;
            right: -15px;
            width: 30px;
            height: 30px;
            background: #e74c3c;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 16px;
            font-weight: bold;
            box-shadow: 0 4px 8px rgba(231, 76, 60, 0.3);
            z-index: 10;
          }

          /* Changes Table */
          .changes-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            border-radius: 10px;
            overflow: hidden;
          }

          .changes-table th {
            background: linear-gradient(135deg, #0A183A 0%, #173D68 100%);
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-size: 12px;
          }

          .changes-table td {
            padding: 15px;
            border-bottom: 1px solid #eee;
            background: white;
          }

          .changes-table tr:nth-child(even) td {
            background: #f8f9fa;
          }

          .changes-table tr:hover td {
            background: #e6f2ff;
          }

          .position-badge {
            background: linear-gradient(135deg, #1E76B6 0%, #348CCB 100%);
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
          }

          .arrow-symbol {
            color: #e74c3c;
            font-size: 18px;
            font-weight: bold;
          }

          /* Footer */
          .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #eee;
            color: #666;
          }

          .footer-logo {
            font-size: 24px;
            font-weight: bold;
            color: #1E76B6;
            margin-bottom: 10px;
          }

          .footer-text {
            font-size: 14px;
            line-height: 1.6;
          }

          /* Print Styles */
          @media print {
            body {
              background: white;
              padding: 0;
            }
            
            .container {
              box-shadow: none;
              border-radius: 0;
            }
            
            .watermark {
              opacity: 0.05;
            }
          }
        </style>
      </head>
      <body>
        <div class="watermark">TIREPRO</div>
        
        <div class="container">
          <div class="header">
            <div class="header-content">
              <div class="logo">🛞 TIREPRO</div>
              <div class="subtitle">Reporte de Rotación de Llantas</div>
              
              <div class="report-info">
                <div class="info-card">
                  <div class="info-label">Vehículo</div>
                  <div class="info-value">${vehicle.placa}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Tipo</div>
                  <div class="info-value">${vehicle.tipovhc || 'N/A'}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Cambios Realizados</div>
                  <div class="info-value">${changes.length}</div>
                </div>
                <div class="info-card">
                  <div class="info-label">Fecha y Hora</div>
                  <div class="info-value">${currentDate}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="content">
            <div class="section">
              <h2 class="section-title">🚛 Configuración del Vehículo</h2>
              
              <div class="vehicle-container">
                <div class="vehicle-title">
                  Distribución de Llantas - ${axisCount} Eje${axisCount > 1 ? 's' : ''}
                </div>
                
                <div class="axle-container">
                  ${layout.map((positions, axleIdx) => {
                    const middleIndex = Math.ceil(positions.length / 2);
                    const leftTires = positions.slice(0, middleIndex);
                    const rightTires = positions.slice(middleIndex);
                    
                    return `
                      <div class="axle">
                        <div class="axle-label">Eje ${axleIdx + 1}</div>
                        
                        <div class="axle-end left"></div>
                        
                        <div class="tire-side">
                          ${leftTires.map(pos => {
                            const tire = tireMap[pos];
                            const hasChange = changeMap[pos];
                            return `
                              <div class="tire-position">
                                <div class="tire ${hasChange ? 'changed' : ''}">
                                  ${hasChange ? `<div class="change-arrow">↻</div>` : ''}
                                  <div>
                                    <div style="font-size: 10px;">${tire?.marca || 'N/A'}</div>
                                    <div style="font-size: 9px;">Pos ${pos}</div>
                                  </div>
                                </div>
                                <div class="tire-connector"></div>
                                <div class="position-label">${pos}</div>
                              </div>
                            `;
                          }).join('')}
                        </div>

                        <div class="axle-body"></div>

                        <div class="tire-side">
                          ${rightTires.map(pos => {
                            const tire = tireMap[pos];
                            const hasChange = changeMap[pos];
                            return `
                              <div class="tire-position">
                                <div class="tire ${hasChange ? 'changed' : ''}">
                                  ${hasChange ? `<div class="change-arrow">↻</div>` : ''}
                                  <div>
                                    <div style="font-size: 10px;">${tire?.marca || 'N/A'}</div>
                                    <div style="font-size: 9px;">Pos ${pos}</div>
                                  </div>
                                </div>
                                <div class="tire-connector"></div>
                                <div class="position-label">${pos}</div>
                              </div>
                            `;
                          }).join('')}
                        </div>

                        <div class="axle-end right"></div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            ${changes.length > 0 ? `
            <div class="section">
              <h2 class="section-title">🔄 Detalle de Cambios Realizados</h2>
              
              <table class="changes-table">
                <thead>
                  <tr>
                    <th>Llanta</th>
                    <th>Posición Original</th>
                    <th></th>
                    <th>Posición Nueva</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  ${changes.map(change => `
                    <tr>
                      <td style="font-weight: bold;">${change.marca}</td>
                      <td>
                        <span class="position-badge">
                          ${change.originalPosition === "0" ? "Inventario" : `Posición ${change.originalPosition}`}
                        </span>
                      </td>
                      <td style="text-align: center;">
                        <span class="arrow-symbol">→</span>
                      </td>
                      <td>
                        <span class="position-badge">
                          ${change.newPosition === "0" ? "Inventario" : `Posición ${change.newPosition}`}
                        </span>
                      </td>
                      <td style="color: #27ae60; font-weight: bold;">✓ Completado</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
          </div>

          <div class="footer">
            <div class="footer-logo">🛞 TIREPRO</div>
            <div class="footer-text">
              Sistema de Gestión de Llantas Profesional<br>
              Reporte generado automáticamente el ${currentDate}
            </div>
          </div>
        </div>

        <script>
          // Auto-print when loaded
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 1000);
          };
        </script>
      </body>
      </html>
    `;

    // Write content and print
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return { generatePDF };
};

export default CroquisPdf;