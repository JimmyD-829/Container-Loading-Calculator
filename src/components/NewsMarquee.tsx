import React, { useState, useEffect, useRef } from 'react';
import WeatherWidget from './WeatherWidget';

interface NewsItem {
  id: number;
  title: string;
  source: string;
  url: string;
}

const defaultNewsData: NewsItem[] = [
  { id: 1, title: '上海港自动化码头吞吐量突破千万标箱', source: '中国水运网', url: 'https://www.cnss.com.cn' },
  { id: 2, title: '中欧班列开行数量同比增长15%', source: '人民网', url: 'https://www.people.com.cn' },
  { id: 3, title: '跨境电商物流新规正式实施', source: '商务部官网', url: 'https://www.mofcom.gov.cn' },
  { id: 4, title: '智能仓储机器人技术获重大突破', source: '科技日报', url: 'https://www.stdaily.com' },
  { id: 5, title: '全球航运联盟调整航线布局', source: '国际船舶网', url: 'https://www.ship.sh' },
  { id: 6, title: '冷链物流标准体系进一步完善', source: '中国物流与采购网', url: 'https://www.chinawuliu.com' },
  { id: 7, title: '港口智慧化改造全面提速', source: '中国交通新闻网', url: 'https://www.chncn.com' },
  { id: 8, title: '绿色包装材料在物流行业广泛应用', source: '中国环境报', url: 'https://www.cenews.com.cn' },
];

const NewsMarquee: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [newsData, setNewsData] = useState<NewsItem[]>(defaultNewsData);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  useEffect(() => {
    const updateNews = () => {
      const now = new Date();
      setLastUpdateTime(now);
      const shuffled = [...defaultNewsData].sort(() => Math.random() - 0.5);
      setNewsData(shuffled);
    };

    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setHours(8, 0, 0, 0);
    if (now.getHours() >= 8) {
      nextUpdate.setDate(nextUpdate.getDate() + 1);
    }
    const delay = nextUpdate.getTime() - now.getTime();

    const intervalId = setTimeout(() => {
      updateNews();
      const dailyInterval = setInterval(updateNews, 24 * 60 * 60 * 1000);
      return () => clearInterval(dailyInterval);
    }, delay);

    return () => clearTimeout(intervalId);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="news-marquee-container" ref={containerRef}>
      <div className="marquee-label">
        <span className="label-icon">📰</span>
        <span className="label-text">物流资讯</span>
        <span className="update-time">更新于 {formatTime(lastUpdateTime)}</span>
      </div>
      <div className={`marquee-track ${isHovered ? 'paused' : ''}`}>
        <div className="marquee-content">
          {newsData.map((news) => (
            <a
              key={news.id}
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="marquee-item"
            >
              <span className="news-bullet">●</span>
              <span className="news-title">{news.title}</span>
              <span className="news-source">{news.source}</span>
              <span className="news-divider">|</span>
            </a>
          ))}
        </div>
        <div className="marquee-content" aria-hidden="true">
          {newsData.map((news) => (
            <a
              key={news.id}
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="marquee-item"
            >
              <span className="news-bullet">●</span>
              <span className="news-title">{news.title}</span>
              <span className="news-source">{news.source}</span>
              <span className="news-divider">|</span>
            </a>
          ))}
        </div>
      </div>
      <WeatherWidget />
    </div>
  );
};

export default NewsMarquee;
