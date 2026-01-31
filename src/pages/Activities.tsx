import { motion } from 'framer-motion';
import { useState } from 'react';
import './Activities.css';

interface Project {
    title: string;
    tech: string;
    demo: string;
    image: string;
}

const Activities = () => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const projects: Project[] = [
        {
            title: 'Basic e-commerce website',
            tech: 'HTML, CSS, JavaScript, Bootstrap',
            demo: 'https://jhrahman.github.io/laurels/',
            image: `${import.meta.env.BASE_URL}images/project1.jpg`
        },
        {
            title: 'CRUD Operation Web Application',
            tech: 'Google script, HTML, CSS, JavaScript',
            demo: 'https://jtv-pc.netlify.app/',
            image: `${import.meta.env.BASE_URL}images/project2.png`
        },
        {
            title: 'Internal Office Network Topology',
            tech: 'DHCP, VLAN, VTP, InterVLAN Routing, IP Routing, Static Route, SSH, Switching, Standard ACL and Extended ACL',
            demo: 'https://drive.google.com/file/d/1u0W54EIry-97U9iHSsNJhHDFw84spU95/view?usp=sharing',
            image: `${import.meta.env.BASE_URL}images/project3.png`
        },
        {
            title: 'ShiftMate - Automated Team Roster',
            tech: 'HTML5, CSS3, JavaScript, Vanilla JS, GitHub Actions, Discord Webhook API, GitHub API',
            demo: 'https://jhrahman.github.io/shiftmate/',
            image: `${import.meta.env.BASE_URL}images/project4.png`
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const itemVariants = {
        hidden: { y: 50, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.6, type: 'spring' }
        }
    };

    return (
        <motion.div
            className="page activities-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <div className="container">
                <motion.h1
                    className="page-title gradient-text"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                >
                    My Activities
                </motion.h1>

                <motion.div
                    className="projects-grid"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    {projects.map((project, index) => (
                        <motion.div
                            key={index}
                            className="project-card glass-effect"
                            variants={itemVariants}
                            whileHover={{ y: -10 }}
                        >
                            <div
                                className="project-image-wrapper"
                                onClick={() => setSelectedImage(project.image)}
                            >
                                <img
                                    src={project.image}
                                    alt={project.title}
                                    className="project-image"
                                />
                                <div className="project-image-overlay">
                                    <span className="view-icon">🔍</span>
                                </div>
                            </div>

                            <div className="project-content">
                                <h3 className="project-title">{project.title}</h3>
                                <div className="project-tech-container">
                                    {project.tech.split(', ').map((tech, i) => (
                                        <span key={i} className="tech-badge">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                                <a
                                    href={project.demo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="project-demo-btn"
                                >
                                    View Demo →
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <motion.div
                    className="image-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedImage(null)}
                >
                    <motion.div
                        className="image-modal-content"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="image-modal-close"
                            onClick={() => setSelectedImage(null)}
                        >
                            ✕
                        </button>
                        <img src={selectedImage} alt="Project preview" />
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default Activities;
