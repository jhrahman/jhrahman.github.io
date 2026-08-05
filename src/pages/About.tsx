import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './About.css';
import RecommendationsCarousel from '../components/RecommendationsCarousel';

// Staggered reveal for the hero intro (greeting, then the bio paragraph) -
// runs on every mount, so it plays the same whether this is a fresh visit
// or a client-side navigation back to /about. delayChildren starts it just
// after the hero card itself begins fading in (that one's delayed 0.2s),
// so the two overlap into one continuous cascade instead of a dead pause
// followed by a second, disconnected-feeling animation.
const heroTextContainerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
};

const heroTextItemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const identityTags = [
    { icon: 'fa-vial', label: 'QA Engineer' },
    { icon: 'fa-robot', label: 'Automation Builder' },
    { icon: 'fa-diagram-project', label: 'DevOps Enthusiast' },
    { icon: 'fa-headset', label: 'Support Specialist' },
    { icon: 'fa-lightbulb', label: 'Problem Solver' },
    { icon: 'fa-seedling', label: 'Adaptive Learner' },
];

const About = () => {
    const [age, setAge] = useState(0);
    const [tagIndex, setTagIndex] = useState(0);

    useEffect(() => {
        const birthDate = new Date('1998-01-13');
        const today = new Date();
        let calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            calculatedAge--;
        }
        setAge(calculatedAge);
    }, []);

    useEffect(() => {
        const id = setInterval(() => {
            setTagIndex((i) => (i + 1) % identityTags.length);
        }, 2800);
        return () => clearInterval(id);
    }, []);

    const skillCategories = [
        {
            category: 'Test Automation & QA',
            icon: 'fa-vial',
            items: ['Playwright (UI & API)', 'Playwright Agents (Planner, Generator, Healer)', 'E2E Testing', 'Page Object Model', 'Functional Testing', 'Regression Testing', 'Smoke Testing', 'Sanity Testing', 'Retesting', 'Manual Testing', 'Exploratory Testing', 'Defect Management', 'BugBug (AI-assisted automation)']
        },
        {
            category: 'CI/CD & Containers',
            icon: 'fa-diagram-project',
            items: ['GitHub Actions', 'Git', 'GitHub', 'Docker', 'Docker Compose']
        },
        {
            category: 'API & Performance Testing',
            icon: 'fa-plug',
            items: ['REST APIs', 'Postman', 'JMeter', 'k6']
        },
        {
            category: 'Cross-Platform Testing',
            icon: 'fa-display',
            items: ['Web', 'Android', 'iOS', 'Apple TV', 'Android TV']
        },
        {
            category: 'Defect & Production Support',
            icon: 'fa-bug',
            items: ['Root Cause Analysis', 'Production Issue Triage', 'Application Troubleshooting']
        },
        {
            category: 'Cloud & Monitoring',
            icon: 'fa-cloud',
            items: ['AWS (S3, EC2, IAM, CloudWatch, DynamoDB, Cognito)', 'Datadog']
        },
        {
            category: 'Methodologies',
            icon: 'fa-arrows-spin',
            items: ['Agile (Scrum)', 'SDLC', 'STLC']
        },
        {
            category: 'Databases & SQL',
            icon: 'fa-database',
            items: ['SQL', 'PostgreSQL (psql)', 'DBeaver']
        },
        {
            category: 'Programming',
            icon: 'fa-code',
            items: ['TypeScript', 'JavaScript']
        },
        {
            category: 'AI-Assisted Tools',
            icon: 'fa-robot',
            items: ['Claude Code', 'GitHub Copilot', 'Google Antigravity (Agentic IDE)', 'ChatGPT (Codex)']
        },
        {
            category: 'Domain Experience',
            icon: 'fa-satellite-dish',
            items: ['OTT Platforms', 'Broadcast & Streaming Operations', 'Content Management Systems']
        },
        {
            category: 'Collaboration',
            icon: 'fa-people-group',
            items: ['Jira', 'Confluence', 'Slack']
        }
    ];

    const experiences = [
        {
            period: 'January, 2024 - Present',
            title: 'Technical Support Associate — Software QA & Tech Support',
            company: 'Craftsmen Limited',
            responsibilities: [
                'Review business requirements, user stories, and acceptance criteria to identify testable requirements, edge cases, and risks',
                'Design and execute functional and regression test cases across cloud-based SaaS applications',
                'Validate REST APIs using Postman, verifying payloads, status codes, authentication, and business logic',
                'Execute cross-platform testing across Web, Android, iOS, Apple TV, and Android TV',
                'Built automated regression suites with BugBug, reaching ~90% coverage and cutting regression testing time from 5 days to 2',
                'Investigate production issues through log analysis and root cause analysis using Datadog and AWS CloudWatch'
            ]
        },
        {
            period: 'December, 2022 - January, 2024 (1 Year)',
            title: 'IT & Broadcast Engineer',
            company: 'Jamuna Television Ltd, a concern of Jamuna Group',
            responsibilities: [
                'Monitored servers, networks, and system health across enterprise infrastructure supporting 500+ users',
                'Triaged and resolved critical L1/L2 technical incidents across Windows, Linux, and macOS environments',
                'Supported disaster recovery operations and ensured data backup integrity for business continuity'
            ]
        },
        {
            period: 'November, 2021 - November, 2022 (1.1 Year)',
            title: 'BO & E',
            company: 'T Sports, a concern of Bashundhara Group',
            responsibilities: [
                'Maintained broadcast continuity by proactively monitoring workflows and transmission quality',
                'Managed ingest and archive workflows for seamless media operations with high accuracy and consistency'
            ]
        }
    ];

    const education = [
        {
            period: '2016 - 2020',
            degree: 'B.Sc in Electrical and Electronic Engineering',
            institution: 'North South University, Dhaka'
        },
        {
            period: '2014 - 2015',
            degree: 'Higher Secondary School Certificate',
            institution: 'Birshreshtha Noor Mohammad Public College, Dhaka'
        },
        {
            period: '2010 - 2012',
            degree: 'Secondary School Certificate',
            institution: 'Comilla Modern High School, Comilla'
        }
    ];

    const certifications: {
        year?: string;
        title: string;
        issuer: string;
        link?: string;
    }[] = [
        {
            year: '2026',
            title: 'The Complete Software Testing Bootcamp',
            issuer: 'Udemy',
            link: 'https://www.udemy.com/certificate/UC-9c7cdd45-f43c-46fd-a5e8-8c0a2655888f/'
        },
        {
            year: '2024',
            title: 'AWS Cloud Technical Essentials',
            issuer: 'Amazon Web Services',
            link: 'https://coursera.org/verify/NUK7RYKTU75D'
        },
        {
            year: '2025',
            title: 'SQL Basics',
            issuer: 'HackerRank',
            link: 'https://www.hackerrank.com/certificates/3798371304ba'
        },
        {
            year: '2023',
            title: 'Cisco Certified Network Associate (CCNA)',
            issuer: 'CSL Training',
            link: 'https://drive.google.com/file/d/1y6uIAJnzUEjZVBqYzGaNmVTRVWqnyeGF/view?usp=sharing'
        },
        {
            year: '2020 - 2021',
            title: 'Crash Course on Python',
            issuer: 'Google',
            link: 'https://coursera.org/share/7b38e5f7887f951f528684e2935cbcc1'
        },
        {
            year: '2022',
            title: 'IT Support Specialization',
            issuer: 'Google',
            link: 'https://coursera.org/share/83eee8cdbc24c97596a2ea628a23911a'
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: {
            y: 0,
            opacity: 1,
            transition: { duration: 0.5 }
        }
    };

    return (
        <motion.div
            className="page about-page"
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
                    About Me
                </motion.h1>

                <motion.div
                    className="about-hero-card glass-effect"
                    initial={{ y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4 }}
                >
                    <div className="about-photo-frame">
                        <div
                            className="about-photo-media"
                            style={{ backgroundImage: `url(${import.meta.env.BASE_URL}images/about/portrait.webp)` }}
                        >
                            <img
                                src={`${import.meta.env.BASE_URL}images/about/portrait.webp`}
                                alt="Jahidur Rahman presenting at a company AI workshop"
                                loading="lazy"
                            />
                        </div>
                        <span className="about-photo-badge">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={identityTags[tagIndex].label}
                                    className="about-photo-badge-inner"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.35 }}
                                >
                                    <i className={`fas ${identityTags[tagIndex].icon}`} aria-hidden="true"></i>
                                    {identityTags[tagIndex].label}
                                </motion.span>
                            </AnimatePresence>
                        </span>
                    </div>

                    <motion.div
                        className="about-hero-text"
                        variants={heroTextContainerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <motion.span className="about-greeting" variants={heroTextItemVariants}>
                            Hi, I&apos;m Jahid
                        </motion.span>
                        <motion.p className="about-intro" variants={heroTextItemVariants}>
                            QA and Technical Support professional who crafts testing strategies that drive real business outcomes. Built automated regression suites that cut testing time from 5 days to 2 while reaching about 90% coverage, validated REST APIs to keep cloud-based SaaS releases reliable, and traced production issues to root cause using Datadog and AWS CloudWatch to protect uptime for end users. Comfortable testing across Web, Android, iOS, and TV platforms, with hands-on experience building Playwright automation frameworks wired into CI/CD pipelines with Docker.
                        </motion.p>
                    </motion.div>
                </motion.div>

                {/* Basic Info - New Icon Grid Design */}
                <motion.section
                    className="section"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.h2 variants={itemVariants} className="section-title">Basic Info</motion.h2>
                    <motion.div className="basic-info-grid" variants={itemVariants}>
                        <div className="basic-info-card glass-effect">
                            <div className="info-icon-wrapper">
                                <i className="fas fa-calendar-alt"></i>
                            </div>
                            <div className="info-content">
                                <span className="info-label">Birthdate</span>
                                <span className="info-value">January 13, 1998</span>
                            </div>
                        </div>

                        <div className="basic-info-card glass-effect">
                            <div className="info-icon-wrapper">
                                <i className="fas fa-hourglass-half"></i>
                            </div>
                            <div className="info-content">
                                <span className="info-label">Age</span>
                                <span className="info-value">{age} Years Old</span>
                            </div>
                        </div>

                        <div className="basic-info-card glass-effect">
                            <div className="info-icon-wrapper">
                                <i className="fas fa-user"></i>
                            </div>
                            <div className="info-content">
                                <span className="info-label">Gender</span>
                                <span className="info-value">Male</span>
                            </div>
                        </div>

                        <div className="basic-info-card glass-effect">
                            <div className="info-icon-wrapper">
                                <i className="fas fa-flag"></i>
                            </div>
                            <div className="info-content">
                                <span className="info-label">Nationality</span>
                                <span className="info-value">Bangladeshi</span>
                            </div>
                        </div>

                        <div className="basic-info-card glass-effect">
                            <div className="info-icon-wrapper">
                                <i className="fas fa-map-marker-alt"></i>
                            </div>
                            <div className="info-content">
                                <span className="info-label">City</span>
                                <span className="info-value">Dhaka</span>
                            </div>
                        </div>

                        <div className="basic-info-card glass-effect">
                            <div className="info-icon-wrapper">
                                <i className="fas fa-globe-asia"></i>
                            </div>
                            <div className="info-content">
                                <span className="info-label">Country</span>
                                <span className="info-value">Bangladesh</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.section>

                {/* Skills */}
                <motion.section
                    className="section"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    <motion.h2 variants={itemVariants} className="section-title">Skills</motion.h2>
                    <motion.div className="skills-categories" variants={containerVariants}>
                        {skillCategories.map((group) => (
                            <motion.div key={group.category} className="skill-category" variants={itemVariants}>
                                <h3 className="skill-category-title">
                                    <i className={`fas ${group.icon}`} aria-hidden="true"></i>
                                    {group.category}
                                </h3>
                                <div className="skill-chip-row">
                                    {group.items.map((skill) => (
                                        <motion.span
                                            key={skill}
                                            className="skill-chip"
                                            whileHover={{ scale: 1.05, y: -3 }}
                                            transition={{ type: 'spring', stiffness: 300 }}
                                        >
                                            {skill}
                                        </motion.span>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div
                        className="skills-cta"
                        variants={itemVariants}
                    >
                        <Link to="/activities" className="skills-cta-btn">
                            <span>See These Skills in Action</span>
                            <i className="fas fa-arrow-right" aria-hidden="true"></i>
                        </Link>
                    </motion.div>
                </motion.section>

                {/* Experience */}
                <motion.section
                    className="section"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    <motion.h2 variants={itemVariants} className="section-title">Career Experience</motion.h2>
                    <div className="timeline">
                        {experiences.map((exp, index) => (
                            <motion.div
                                key={index}
                                className="timeline-item glass-effect"
                                variants={itemVariants}
                                whileHover={{ x: 10 }}
                                whileTap={{ x: 10, scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <span className="timeline-period">{exp.period}</span>
                                    <h3 className="timeline-title">{exp.title}</h3>
                                    <p className="timeline-company">{exp.company}</p>
                                    <ul className="timeline-responsibilities">
                                        {exp.responsibilities.map((point, i) => (
                                            <li key={i}>{point}</li>
                                        ))}
                                    </ul>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Education */}
                <motion.section
                    className="section"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    <motion.h2 variants={itemVariants} className="section-title">Education</motion.h2>
                    <div className="timeline">
                        {education.map((edu, index) => (
                            <motion.div
                                key={index}
                                className="timeline-item glass-effect"
                                variants={itemVariants}
                                whileHover={{ x: 10 }}
                                whileTap={{ x: 10, scale: 0.98 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                            >
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <span className="timeline-period">{edu.period}</span>
                                    <h3 className="timeline-title">{edu.degree}</h3>
                                    <p className="timeline-company">{edu.institution}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.section>

                {/* Certifications */}
                <motion.section
                    className="section"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                >
                    <motion.h2 variants={itemVariants} className="section-title">License and Certification</motion.h2>
                    <motion.div className="cert-grid" variants={containerVariants}>
                        {certifications.map((cert, index) => (
                            <motion.div
                                key={index}
                                className="cert-card glass-effect"
                                variants={itemVariants}
                                whileHover={{ y: -10 }}
                            >
                                {cert.year && <span className="cert-year">{cert.year}</span>}
                                <h3 className="cert-title">{cert.title}</h3>
                                <p className="cert-issuer">{cert.issuer}</p>
                                {cert.link && (
                                    <a
                                        href={cert.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="cert-link"
                                    >
                                        View Credential →
                                    </a>
                                )}
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.section>

                <RecommendationsCarousel />
            </div>
        </motion.div>
    );
};

export default About;
