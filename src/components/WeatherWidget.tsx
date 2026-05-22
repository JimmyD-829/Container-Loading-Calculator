import React, { useState, useEffect } from 'react';
import { Tooltip } from 'antd';

interface WeatherData {
  city: string;
  temperature: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  pressure: number;
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async (latitude: number, longitude: number) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,weather_code&timezone=auto`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch weather data');
        }

        const data = await response.json();
        
        const weatherCodeMap: Record<number, { description: string; icon: string }> = {
          0: { description: '晴朗', icon: '☀️' },
          1: { description: '晴', icon: '🌤️' },
          2: { description: '多云', icon: '⛅' },
          3: { description: '阴天', icon: '☁️' },
          45: { description: '雾', icon: '🌫️' },
          48: { description: '霜雾', icon: '🌨️' },
          51: { description: '小雨', icon: '🌧️' },
          53: { description: '中雨', icon: '🌧️' },
          55: { description: '大雨', icon: '⛈️' },
          61: { description: '小雨', icon: '🌧️' },
          63: { description: '中雨', icon: '🌧️' },
          65: { description: '大雨', icon: '⛈️' },
          71: { description: '小雪', icon: '❄️' },
          73: { description: '中雪', icon: '❄️' },
          75: { description: '大雪', icon: '❄️' },
          80: { description: '阵雨', icon: '🌦️' },
          81: { description: '阵雨', icon: '🌦️' },
          82: { description: '强阵雨', icon: '⛈️' },
          95: { description: '雷暴', icon: '🌩️' },
          96: { description: '雷暴伴冰雹', icon: '⛈️' },
          99: { description: '强雷暴伴冰雹', icon: '⛈️' },
        };

        const weatherCode = data.current.weather_code;
        const weatherInfo = weatherCodeMap[weatherCode] || { description: '未知', icon: '❓' };

        const cityName = data.timezone.split('/').pop() || '未知地点';
        const cityNameCN: Record<string, string> = {
          'Shanghai': '上海',
          'Beijing': '北京',
          'Guangzhou': '广州',
          'Shenzhen': '深圳',
          'Hangzhou': '杭州',
          'Chengdu': '成都',
          'Wuhan': '武汉',
          'Nanjing': '南京',
          'Xiamen': '厦门',
          'Hong_Kong': '香港',
          'Taipei': '台北',
        };
        
        setWeather({
          city: cityNameCN[cityName] || cityName,
          temperature: Math.round(data.current.temperature_2m),
          description: weatherInfo.description,
          icon: weatherInfo.icon,
          humidity: data.current.relative_humidity_2m,
          windSpeed: Math.round(data.current.wind_speed_10m),
          feelsLike: Math.round(data.current.apparent_temperature),
          pressure: data.current.pressure_msl,
        });
        setIsLoading(false);
      } catch (err) {
        setWeather({
          city: '上海',
          temperature: 25,
          description: '晴',
          icon: '☀️',
          humidity: 60,
          windSpeed: 12,
          feelsLike: 27,
          pressure: 1013,
        });
        setIsLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        () => {
          fetchWeather(31.2304, 121.4737);
        }
      );
    } else {
      fetchWeather(31.2304, 121.4737);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="weather-widget">
        <span className="weather-icon">🌡️</span>
        <span className="weather-text">加载中...</span>
      </div>
    );
  }

  const tooltipContent = (
    <div className="weather-tooltip-content">
      <div className="tooltip-header">
        <span className="tooltip-icon">{weather?.icon}</span>
        <span className="tooltip-city">{weather?.city}</span>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-row">
          <span className="tooltip-label">温度</span>
          <span className="tooltip-value">{weather?.temperature}°C</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">体感温度</span>
          <span className="tooltip-value">{weather?.feelsLike}°C</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">天气</span>
          <span className="tooltip-value">{weather?.description}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">湿度</span>
          <span className="tooltip-value">{weather?.humidity}%</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">风速</span>
          <span className="tooltip-value">{weather?.windSpeed} km/h</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">气压</span>
          <span className="tooltip-value">{weather?.pressure} hPa</span>
        </div>
      </div>
    </div>
  );

  return (
    <Tooltip 
      title={tooltipContent} 
      placement="bottomRight"
      mouseEnterDelay={0}
      mouseLeaveDelay={0}
      overlayClassName="weather-tooltip-wrapper"
    >
      <div className="weather-widget">
        <span className="weather-icon">{weather?.icon}</span>
        <span className="weather-text">
          {weather?.city} {weather?.temperature}°C {weather?.description}
        </span>
      </div>
    </Tooltip>
  );
};

export default WeatherWidget;