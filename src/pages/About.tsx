import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import './About.css';

const About = () => {
    const [age, setAge] = useState(0);

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

    const skills = [
        'Technical Support', 'Service Desk (Jira)', 'AWS Cloud', 'Bash scripting',
        'Advanced Linux commands', 'Manual Testing (Xray)', 'QA automation (BugBug)',
        'Postman', 'GitHub', 'Docker', 'PostgreSQL', 'Networking- Routing & Switching',
        'System Administration', 'AI driven tech support', 'Broadcast/OTT Operations', 'IT Operations'
    ];

    const experiences = [
        {
            period: 'January, 2024 - Present',
            title: 'Technical Support Associate',
            company: 'Craftsmen Limited'
        },
        {
            period: 'December, 2022 - January, 2024 (1 Year)',
            title: 'IT & Broadcast Engineer',
            company: 'Jamuna Television Ltd, a concern of Jamuna Group'
        },
        {
            period: 'November, 2021 - November, 2022 (1.1 Year)',
            title: 'BO & E',
            company: 'T Sports, a concern of Bashundhara Group'
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

    const certifications = [
        {
            year: '2024',
            title: 'AWS Cloud Technical Essentials',
            issuer: 'Amazon Web Services',
            link: 'https://coursera.org/verify/NUK7RYKTU75D'
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

                <motion.p
                    className="about-intro"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    I'm a Technical Support Associate (Second-Line), handling advanced and escalated software issues to ensure smooth operations for SaaS platforms. I work with AWS services as part of my regular workflow and continue building skills in DevOps practices, covering AWS, bash scripting, advanced Linux commands, and QA automation to streamline testing and improve efficiency.
                </motion.p>

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
                    <motion.div className="skills-grid" variants={containerVariants}>
                        {skills.map((skill) => (
                            <motion.div
                                key={skill}
                                className="skill-card glass-effect"
                                variants={itemVariants}
                                whileHover={{ scale: 1.05, y: -5 }}
                                transition={{ type: 'spring', stiffness: 300 }}
                            >
                                {skill}
                            </motion.div>
                        ))}
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
                            >
                                <div className="timeline-marker"></div>
                                <div className="timeline-content">
                                    <span className="timeline-period">{exp.period}</span>
                                    <h3 className="timeline-title">{exp.title}</h3>
                                    <p className="timeline-company">{exp.company}</p>
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
                                <span className="cert-year">{cert.year}</span>
                                <h3 className="cert-title">{cert.title}</h3>
                                <p className="cert-issuer">{cert.issuer}</p>
                                <a
                                    href={cert.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="cert-link"
                                >
                                    View Credential →
                                </a>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.section>
            </div>
        </motion.div>
    );
};

export default About;
