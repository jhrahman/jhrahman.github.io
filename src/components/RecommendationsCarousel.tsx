import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
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
        title: "Senior Manager, Broadcast Engineering and ICT, Jamuna Television Ltd",
        image: `${import.meta.env.BASE_URL}images/shuvo.png`,
        text: "He consistently impressed with his dedication, quick learning, and attention to detail. Jahidur's positive attitude and adaptability made him a valuable team member who contributed significantly to various projects. I wish Jahidur the best for a bright and successful future."
    },
    {
        id: 2,
        name: "Abul Kalam Azad",
        title: "Engineering Operations Strategist & Head of Technical Support, Craftsmen Software",
        image: `${import.meta.env.BASE_URL}images/azad.png`,
        text: "I’ve had the pleasure of working with Jahidur Rahman for nearly two years, and it’s been amazing to see his growth. As the youngest member of our team, he stands out for his eagerness to learn and strong professionalism. His curiosity and initiative have helped us simplify and improve our daily support and QA operations. He has prior experiences in technical support; However, working in a software industry which has stakeholders across the globe was completely a new horizon for him. Yet, he managed to settle himself down quite nicely and quickly— which reflects his skill on adaptation. Always flexible, approachable, and open to feedback, he continuously looks for ways to make things better — a true team player with great potential ahead."
    },
    {
        id: 3,
        name: "Rezaul Karim Khan",
        title: "Head of Media Operations, Craftsmen Software",
        image: `${import.meta.env.BASE_URL}images/reza.png`,
        text: "I’ve had the privilege of working with Jahidur and have always been impressed by his strong technical skills and positive, professional attitude. In his role as a Technical Support Associate, he consistently approaches challenges with focus and determination, quickly finding effective solutions and ensuring operations run seamlessly. He’s genuinely eager to learn and always looking to expand his technical knowledge, which reflects his ambition and dedication to personal growth. Reliable, resourceful, and driven — Jahidur is a true asset to any technical team and has a bright future ahead."
    }
];

// Framer Motion's reference swipe-power formula: combines distance and
// velocity so a fast flick and a slow deliberate drag both register.
const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity;

const slideVariants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 80 : -80,
        opacity: 0,
    }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({
        x: direction > 0 ? -80 : 80,
        opacity: 0,
    }),
};

const RecommendationsCarousel = () => {
    const [[currentIndex, direction], setSlide] = useState([0, 0]);
    // Two independent pause sources: an explicit user toggle (persists until
    // toggled again) and a transient one for hover/focus/drag (auto-clears).
    const [manuallyPaused, setManuallyPaused] = useState(false);
    const [interacting, setInteracting] = useState(false);
    const isPaused = manuallyPaused || interacting;
    const timeoutRef = useRef<number | null>(null);

    const paginate = (newDirection: number) => {
        setSlide(([prevIndex]) => {
            const nextIndex = (prevIndex + newDirection + recommendations.length) % recommendations.length;
            return [nextIndex, newDirection];
        });
    };

    const goToSlide = (index: number) => {
        setSlide(([prevIndex]) => [index, index > prevIndex ? 1 : -1]);
    };

    const handleDragEnd = (_e: unknown, { offset, velocity }: PanInfo) => {
        const swipe = swipePower(offset.x, velocity.x);

        if (swipe < -swipeConfidenceThreshold) {
            paginate(1);
        } else if (swipe > swipeConfidenceThreshold) {
            paginate(-1);
        }

        // Touch devices have no persistent "hover" to clear this, so release
        // the transient pause as soon as the gesture ends.
        setInteracting(false);
    };

    useEffect(() => {
        if (!isPaused) {
            timeoutRef.current = window.setInterval(() => paginate(1), 5000);
        }

        return () => {
            if (timeoutRef.current) {
                clearInterval(timeoutRef.current);
            }
        };
    }, [isPaused, currentIndex]);

    const current = recommendations[currentIndex];

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
                className={`carousel-container${isPaused ? ' is-paused' : ''}`}
                role="region"
                aria-roledescription="carousel"
                aria-label="Recommendations from colleagues"
                tabIndex={0}
                onMouseEnter={() => setInteracting(true)}
                onMouseLeave={() => setInteracting(false)}
                onFocus={() => setInteracting(true)}
                onBlur={() => setInteracting(false)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        paginate(-1);
                    } else if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        paginate(1);
                    }
                }}
            >
                <button
                    type="button"
                    className="carousel-nav-btn carousel-nav-prev"
                    onClick={() => paginate(-1)}
                    aria-label="Previous recommendation"
                >
                    <i className="fas fa-chevron-left" aria-hidden="true"></i>
                </button>

                <div className="carousel-track-container">
                    <AnimatePresence initial={false} custom={direction} mode="wait">
                        <motion.div
                            key={current.id}
                            className="recommendation-card active"
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{
                                x: { type: 'spring', stiffness: 300, damping: 30 },
                                opacity: { duration: 0.2 },
                            }}
                            drag="x"
                            dragConstraints={{ left: 0, right: 0 }}
                            dragElastic={0.7}
                            onDragStart={() => setInteracting(true)}
                            onDragEnd={handleDragEnd}
                            style={{ touchAction: 'pan-y' }}
                            role="group"
                            aria-roledescription="slide"
                            aria-label={`${currentIndex + 1} of ${recommendations.length}`}
                        >
                            <div className="card-content">
                                <div className="recommender-image-wrapper">
                                    <img
                                        src={current.image}
                                        alt={current.name}
                                        className="recommender-image"
                                        draggable={false}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/100?text=User';
                                        }}
                                    />
                                </div>

                                <div className="recommender-info">
                                    <h3 className="recommender-name">{current.name}</h3>
                                    <p className="recommender-title">{current.title}</p>
                                </div>

                                <div className="quote-icon">
                                    <i className="fas fa-quote-left"></i>
                                </div>

                                <p className="recommendation-text">
                                    {current.text}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>

                <button
                    type="button"
                    className="carousel-nav-btn carousel-nav-next"
                    onClick={() => paginate(1)}
                    aria-label="Next recommendation"
                >
                    <i className="fas fa-chevron-right" aria-hidden="true"></i>
                </button>

                {/* Screen-reader-only live announcement of the current slide */}
                <p className="sr-only" aria-live="polite">
                    Showing recommendation {currentIndex + 1} of {recommendations.length}: {current.name}
                </p>

                <div className="carousel-footer">
                    <div className="carousel-indicators">
                        {recommendations.map((rec, index) => (
                            <button
                                key={rec.id}
                                type="button"
                                className={`indicator-line ${index === currentIndex ? 'active' : ''}`}
                                onClick={() => goToSlide(index)}
                                aria-label={`Go to recommendation ${index + 1}`}
                                aria-current={index === currentIndex}
                            >
                                {index === currentIndex && (
                                    <span className="progress-fill" key={current.id}></span>
                                )}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="carousel-play-toggle"
                        onClick={() => setManuallyPaused((p) => !p)}
                        aria-label={manuallyPaused ? 'Play automatic slideshow' : 'Pause automatic slideshow'}
                        aria-pressed={manuallyPaused}
                    >
                        <i className={`fas ${manuallyPaused ? 'fa-play' : 'fa-pause'}`} aria-hidden="true"></i>
                    </button>
                </div>
            </div>
        </motion.section>
    );
};

export default RecommendationsCarousel;
