import React, { useEffect, useState, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';

// Registro de componentes de Chart.js
ChartJS.register(Filler, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Definición del tipo de datos del gráfico
type ChartData = {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    pointBackgroundColor: string;
    pointRadius: number;
    fill: boolean;
    tension: number;
  }[];
};

export default function CryptoChart() {
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
  });
  const [currentPrices, setCurrentPrices] = useState<{ BTC: number; ETH: number } | null>(null);
  const [error, setError] = useState<string | null>(null); // Mantener la variable de error

  // Función para obtener datos del gráfico
  const fetchData = useCallback(async () => {
    setError(null);
    console.log("Fetching data...");
    try {
      const response = await fetch('https://redfulp5b9.execute-api.us-east-1.amazonaws.com/lambda_function?range=1D');
      if (!response.ok) {
        throw new Error(`Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.historical_prices && Array.isArray(data.historical_prices)) {
        const hourlyData: { [key: string]: { BTC: number; ETH: number } } = {};

        // Manejar la respuesta para datos históricos
        data.historical_prices.forEach((item: { timestamp: string | null; symbol: string; price: number }) => {
          if (item.timestamp && typeof item.timestamp === 'string') {
            const [datePart, timePart] = item.timestamp.split('T');
            if (timePart && timePart.includes(':')) {
              const hour = datePart + ' ' + timePart.split(':')[0]; // Concatenar la fecha y la hora hasta la parte de las horas
              
              if (!hourlyData[hour]) {
                hourlyData[hour] = { BTC: 0, ETH: 0 };
              }
              
              // Actualizar los precios para BTC y ETH
              if (item.symbol === 'BTC') {
                hourlyData[hour].BTC = item.price;
              } else if (item.symbol === 'ETH') {
                hourlyData[hour].ETH = item.price;
              }
            }
          } else {
            // Agregar manejo de errores si el timestamp no es válido
            console.warn('Invalid timestamp:', item.timestamp);
          }
        });
        
        // Convertir el objeto a un array para el gráfico
        const newLabels = Object.keys(hourlyData);
        const newBtcData = Object.values(hourlyData).map((value) => value.BTC);
        const newEthData = Object.values(hourlyData).map((value) => value.ETH);
        
        // Filtrar datos vacíos
        const filteredBtcData = newBtcData.filter((price) => price !== 0);
        const filteredEthData = newEthData.filter((price) => price !== 0);
        const filteredLabels = newLabels.filter((_, index) => newBtcData[index] !== 0 || newEthData[index] !== 0);
        
        setChartData({
          labels: filteredLabels,
          datasets: [
            {
              label: 'BTC',
              data: filteredBtcData,
              borderColor: 'rgba(0, 123, 255, 0.7)',
              backgroundColor: 'rgba(0, 123, 255, 0.2)',
              pointBackgroundColor: 'rgba(0, 123, 255, 0.9)',
              pointRadius: 3,
              fill: true,
              tension: 0.4,
            },
            {
              label: 'ETH',
              data: filteredEthData,
              borderColor: 'rgba(255, 193, 7, 0.7)',
              backgroundColor: 'rgba(255, 193, 7, 0.2)',
              pointBackgroundColor: 'rgba(255, 193, 7, 0.9)',
              pointRadius: 3,
              fill: true,
              tension: 0.4,
            },
          ],
        });

        // Actualiza el precio actual
        setCurrentPrices({
          BTC: data.current_prices.BTC,
          ETH: data.current_prices.ETH,
        });

      } else {
        throw new Error("Invalid data structure");
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Failed to fetch data. Please try again.');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(() => fetchData(), 30000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false, // Permite que el gráfico ajuste su tamaño
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#333', // Cambia el color de las etiquetas de la leyenda
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 20,
          font: {
            size: 14, // Ajusta el tamaño de fuente
          },
        },
      },
      title: {
        display: true,
        text: 'Prices Over Time',
        font: {
          size: 20,
          family: 'Arial, sans-serif',
          weight: 'bold',
        },
        color: '#444', // Color más suave para el título
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y);
            }
            return label;
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)', // Fondo oscuro para los tooltips
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 12,
        },
        bodySpacing: 8,
        padding: 10,
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)', // Color más suave para las líneas de cuadrícula del eje X
        },
        ticks: {
          color: '#555', // Color de las etiquetas del eje X
          maxRotation: 0, // Evitar rotación en dispositivos pequeños
          autoSkip: true,
          maxTicksLimit: 6, // Reducir la cantidad de ticks para mejorar la legibilidad en pantallas pequeñas
          font: {
            size: 12, // Ajustar el tamaño de la fuente para mejorar la estética
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)', // Color más suave para las líneas de cuadrícula del eje Y
        },
        ticks: {
          color: '#555', // Color de las etiquetas del eje Y
          callback: function (value) {
            return '$' + value.toLocaleString(); // Añadir el símbolo de dólar a las etiquetas del eje Y
          },
          font: {
            size: 12, // Ajustar el tamaño de la fuente para mejorar la estética
          },
        },
      },
    },
    animation: {
      duration: 1000, // Duración de las animaciones
      easing: 'easeInOutQuart', // Añadir una animación suave
    },
  };
  

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-4xl font-bold text-center mb-6">BTC and ETH Prices Over Time</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4">Current Prices:</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
          
          {currentPrices ? (
            <>
              <div className="bg-blue-100 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold">BTC</h3>
                <p className="text-2xl font-bold">${currentPrices.BTC.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-100 p-4 rounded-lg text-center">
                <h3 className="text-lg font-semibold">ETH</h3>
                <p className="text-2xl font-bold">${currentPrices.ETH.toLocaleString()}</p>
              </div>
            </>
          ) : (
            <p className="text-gray-500 text-center">Loading current prices...</p>
          )}
        </div>

        {/* Botón de Refresh */}
        <div className="mb-4 text-center">
          <button
            onClick={fetchData}
            className="bg-blue-500 text-white font-semibold py-2 px-4 rounded shadow hover:bg-blue-600 transition duration-200"
          >
            Refresh Data
          </button>
        </div>

        {/* Gráfico de BTC */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 overflow-hidden h-72 w-full">
          <h3 className="text-lg font-semibold mb-4">BTC Prices</h3>
          <Line 
            data={{
              labels: chartData.labels,
              datasets: [
                {
                  label: 'BTC',
                  data: chartData.datasets[0]?.data || [], // Usar un array vacío si no hay datos
                  borderColor: 'rgba(0, 123, 255, 0.7)',
                  backgroundColor: 'rgba(0, 123, 255, 0.2)',
                  pointBackgroundColor: 'rgba(0, 123, 255, 0.9)',
                  pointRadius: 3,
                  fill: true,
                  tension: 0.4,
                }
              ],
            }}
            options={options}
          />
        </div>

        {/* Gráfico de ETH */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6 overflow-hidden h-72 w-full">
          <h3 className="text-lg font-semibold mb-4">ETH Prices</h3>
          <Line 
            data={{
              labels: chartData.labels,
              datasets: [
                {
                  label: 'ETH',
                  data: chartData.datasets[1]?.data || [], // Usar un array vacío si no hay datos
                  borderColor: 'rgba(255, 193, 7, 0.7)',
                  backgroundColor: 'rgba(255, 193, 7, 0.2)',
                  pointBackgroundColor: 'rgba(255, 193, 7, 0.9)',
                  pointRadius: 3,
                  fill: true,
                  tension: 0.4,
                }
              ],
            }}
            options={options}
          />
        </div>
      </div>

      {error && <div className="text-red-600 text-center mt-4">{error}</div>} {/* Mostrar errores */}
    </div>
  );
}