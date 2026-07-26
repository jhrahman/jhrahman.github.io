import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import './Activities.css';

interface Project {
    title: string;
    tech: string;
    demo: string;
    demoLabel?: string;
    image: string;
    description?: string;
    logoPreview?: boolean;
    graphicPreview?: boolean;
}

const Activities = () => {
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const projects: Project[] = [
        {
            title: 'Dockerized Playwright CI/CD Automation Framework',
            tech: 'Playwright, TypeScript, Docker, GitHub Actions, Allure Report, GitHub Pages',
            demo: 'https://github.com/jhrahman/dockerized-playwright-project',
            demoLabel: 'View on GitHub →',
            image: `${import.meta.env.BASE_URL}images/tech-dockerized-playwright.svg`,
            description: 'GitHub Actions → Docker → Playwright → Allure → Pages, with retries and Discord alerts.',
            graphicPreview: true
        },
        {
            title: 'Playwright API Testing',
            tech: 'Playwright, TypeScript, REST APIs, JSON, Restful Booker API',
            demo: 'https://github.com/jhrahman/playwright-api-testing',
            demoLabel: 'View on GitHub →',
            image: `${import.meta.env.BASE_URL}images/tech-playwright-api.svg`,
            description: 'REST API suite covering GET, POST, PATCH, PUT, DELETE, and header validation, driven by JSON test data.',
            graphicPreview: true
        },
        {
            title: 'AI-Automated Testing for Peoplix',
            tech: 'Playwright MCP, Playwright Agents, Claude Code, RBAC, CRUD Testing',
            demo: 'https://github.com/jhrahman/peoplix-e2e-tests',
            demoLabel: 'View on GitHub →',
            image: `${import.meta.env.BASE_URL}images/tech-peoplix-ai-testing.svg`,
            description: 'Claude Code + Playwright MCP auto-generate regression tests covering auth, RBAC, and CRUD features.',
            graphicPreview: true
        },
        {
            title: 'Playwright Page Object Model Framework',
            tech: 'Playwright, TypeScript, Page Object Model, E2E Testing',
            demo: 'https://github.com/jhrahman/playwright-page-object-model',
            demoLabel: 'View on GitHub →',
            image: `${import.meta.env.BASE_URL}images/tech-playwright-pom.svg`,
            description: 'Page Object Model framework for an e-commerce demo, with reusable page classes for login, listing, and checkout.',
            graphicPreview: true
        },
        {
            title: 'Applywise – AI Powered Job Match Platform',
            tech: 'AI, Client-Side Architecture, Privacy-First, Multi-Provider Fallback',
            demo: 'https://github.com/jhrahman/applywise',
            demoLabel: 'View on GitHub →',
            image: `${import.meta.env.BASE_URL}images/applywise-logo.svg`,
            description: 'Privacy-first, client-side AI job matcher — resumes and keys never leave the browser.',
            logoPreview: true
        },
        {
            title: 'Peoplix – HR Management SaaS',
            tech: 'Next.js, TypeScript, Supabase, RBAC, Testability-First Design',
            demo: 'https://github.com/jhrahman/peoplix',
            demoLabel: 'View on GitHub →',
            image: `${import.meta.env.BASE_URL}images/peoplix-app-icon.png`,
            description: 'Full-stack HR SaaS with RBAC, attendance, leave management, and audit logs.',
            logoPreview: true
        },
        {
            title: 'Basic e-commerce website',
            tech: 'HTML, CSS, JavaScript, Bootstrap',
            demo: 'https://jhrahman.github.io/laurels/',
            image: `${import.meta.env.BASE_URL}images/project1.jpg`,
            description: 'Responsive e-commerce storefront built with Bootstrap, HTML, CSS, and vanilla JavaScript.'
        },
        {
            title: 'CRUD Operation Web Application',
            tech: 'Google script, HTML, CSS, JavaScript',
            demo: 'https://jtv-pc.netlify.app/',
            image: `${import.meta.env.BASE_URL}images/project2.png`,
            description: 'CRUD web app backed by Google Apps Script, with HTML, CSS, and JavaScript for the interface.'
        },
        {
            title: 'Internal Office Network Topology',
            tech: 'DHCP, VLAN, VTP, InterVLAN Routing, IP Routing, Static Route, SSH, Switching, Standard ACL and Extended ACL',
            demo: 'https://drive.google.com/file/d/1u0W54EIry-97U9iHSsNJhHDFw84spU95/view?usp=sharing',
            image: `${import.meta.env.BASE_URL}images/project3.png`,
            description: 'Enterprise network design with VLAN segmentation, InterVLAN routing, SSH, and ACL-based traffic control.'
        },
        {
            title: 'ShiftMate - Automated Team Roster',
            tech: 'HTML5, CSS3, JavaScript, Vanilla JS, GitHub Actions, Discord Webhook API, GitHub API',
            demo: 'https://jhrahman.github.io/shiftmate/',
            image: `${import.meta.env.BASE_URL}images/project4.png`,
            description: 'Automated team roster using GitHub Actions, Vanilla JS, and Discord Webhooks for shift notifications.'
        }
    ];

    useEffect(() => {
        if (!selectedProject) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedProject(null);
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [selectedProject]);

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
                                className={`project-image-wrapper${project.logoPreview ? ' logo-preview' : ''}${project.graphicPreview ? ' graphic-preview' : ''}`}
                                onClick={() => setSelectedProject(project)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSelectedProject(project);
                                    }
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label={`View larger preview of ${project.title}`}
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
                                {project.description && (
                                    <p className="project-description">{project.description}</p>
                                )}
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
                                    {project.demoLabel ?? 'View Demo →'}
                                </a>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* Image Modal */}
            {selectedProject && (
                <motion.div
                    className="image-modal-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedProject(null)}
                >
                    <motion.div
                        className={`image-modal-content${selectedProject.logoPreview ? ' logo-preview' : ''}`}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Project image preview"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="image-modal-close"
                            onClick={() => setSelectedProject(null)}
                            aria-label="Close preview"
                        >
                            ✕
                        </button>
                        {selectedProject.logoPreview ? (
                            <div className="logo-preview-frame">
                                <img src={selectedProject.image} alt={selectedProject.title} />
                            </div>
                        ) : (
                            <img className="preview-image" src={selectedProject.image} alt={selectedProject.title} />
                        )}
                        <p className="image-modal-caption">{selectedProject.title}</p>
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
};

export default Activities;
