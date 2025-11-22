import { motion } from 'framer-motion';
import { useState, FormEvent } from 'react';
import emailjs from '@emailjs/browser';
import './Contact.css';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await emailjs.send(
                'service_79rgt2a',
                'template_5zw7b14',
                {
                    from_name: formData.name,
                    from_email: formData.email,
                    message: formData.message,
                    to_name: 'Jahidur Rahman'
                },
                'QqxYsCendMbsUM64D'
            );

            setShowSuccess(true);
            setFormData({ name: '', email: '', message: '' });

            setTimeout(() => {
                setShowSuccess(false);
            }, 3000);
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send message. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <motion.div
            className="page contact-page"
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
                    Get In Touch
                </motion.h1>

                <motion.p
                    className="contact-subtitle"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                >
                    Feel free to reach out for collaborations, opportunities, or just to say hello!
                </motion.p>

                <motion.div
                    className="contact-container"
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                >
                    <form className="contact-form glass-effect" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="name">
                                <i className="fas fa-user"></i> Your Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="email">
                                <i className="fas fa-envelope"></i> Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="message">
                                <i className="fas fa-comment-dots"></i> Your Message
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                placeholder="Your message here..."
                                rows={6}
                            />
                        </div>

                        <motion.button
                            type="submit"
                            className="submit-btn"
                            disabled={isSubmitting}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isSubmitting ? (
                                <>
                                    <i className="fas fa-spinner fa-spin"></i> Sending...
                                </>
                            ) : (
                                <>
                                    <i className="fas fa-paper-plane"></i> Send Message
                                </>
                            )}
                        </motion.button>
                    </form>

                    {showSuccess && (
                        <motion.div
                            className="success-message"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                        >
                            <i className="fas fa-check-circle"></i> Message sent successfully! I'll get back to you soon.
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Contact;
