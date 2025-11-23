import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import './RecommendationsCarousel.css';

interface Recommendation {
    id: number;
    name: string;
    title: string;
    image: string;
    text: string;
}

const recommendations: Recommendation[] = [
    {
        id: 1,
        name: "Subroto Kumar Shill",
        title: "Manager Broadcast Engineering and ICT, Jamuna Television Ltd",
        image: "/images/shuvo.png",
        text: "He consistently impressed with his dedication, quick learning, and attention to detail. Jahidur's positive attitude and adaptability made him a valuable team member who contributed significantly to various projects. I wish Jahidur the best for a bright and successful future."
    },
    {
        id: 2,
        name: "Abul Kalam Azad",
        title: "Head of Technical Support, Craftsmen Software",
        image: "/images/azad.png",
        text: "I’ve had the pleasure of working with Jahidur Rahman for nearly two years, and it’s been amazing to see his growth. As the youngest member of our team, he stands out for his eagerness to learn and strong professionalism. His curiosity and initiative have helped us simplify and improve our daily support and QA operations. He has prior experiences in technical support; However, working in a software industry which has stakeholders across the globe was completely a new horizon for him. Yet, he managed to settle himself down quite nicely and quickly— which reflects his skill on adaptation. Always flexible, approachable, and open to feedback, he continuously looks for ways to make things better — a true team player with great potential ahead."
    },
    {
        id: 3,
        name: "Rezaul Karim Khan",
        title: "Head of Media Operations, Craftsmen Software",
        image: "/images/reza.png",
        text: "I’ve had the privilege of working with Jahidur and have always been impressed by his strong technical skills and positive, professional attitude. In his role as a Technical Support Associate, he consistently approaches challenges with focus and determination, quickly finding effective solutions and ensuring operations run seamlessly. He’s genuinely eager to learn and always looking to expand his technical knowledge, which reflects his ambition and dedication to personal growth. Reliable, resourceful, and driven — Jahidur is a true asset to any technical team and has a bright future ahead."
    }
];

const RecommendationsCarousel = () => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const nextSlide = () => {
        setCurrentIndex((prevIndex) =>
            prevIndex === recommendations.length - 1 ? 0 : prevIndex + 1
        );
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    useEffect(() => {
        if (!isPaused) {
            timeoutRef.current = window.setInterval(nextSlide, 5000);
        }

        return () => {
            if (timeoutRef.current) {
                clearInterval(timeoutRef.current);
            }
        };
    }, [isPaused, currentIndex]);

    return (
        <motion.section
            className="recommendations-section"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
        >
            <h2 className="recommendations-title">Recommendations</h2>

            <div
                className="carousel-container"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                <div className="carousel-track-container">
                    <div
                        className="carousel-track"
                        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                    >
                        {recommendations.map((rec, index) => (
                            <div
                                key={rec.id}
                                className={`recommendation-card ${index === currentIndex ? 'active' : ''}`}
                            >
                                <div className="card-content">
                                    <div className="recommender-image-wrapper">
                                        <img
                                            src={rec.image}
                                            alt={rec.name}
                                            className="recommender-image"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=User';
                                            }}
                                        />
                                    </div>

                                    <div className="recommender-info">
                                        <h3 className="recommender-name">{rec.name}</h3>
                                        <p className="recommender-title">{rec.title}</p>
                                    </div>

                                    <div className="quote-icon">
                                        <i className="fas fa-quote-left"></i>
                                    </div>

                                    <p className="recommendation-text">
                                        {rec.text}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="carousel-indicators">
                    {recommendations.map((_, index) => (
                        <div
                            key={index}
                            className={`indicator-line ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => goToSlide(index)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Go to slide ${index + 1}`}
                        >
                            {index === currentIndex && (
                                <div className="progress-fill" key={currentIndex}></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
};

export default RecommendationsCarousel;
