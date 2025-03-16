import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css";

function App() {
    const [tickets, setTickets] = useState([]);
    const [newTicket, setNewTicket] = useState({ subject: "", description: "" });
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All");
    const [darkMode, setDarkMode] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Fetch tickets function, wrapped with useCallback to stabilize dependencies
    const fetchTickets = useCallback(async () => {
        try {
            const response = await axios.get(
                `http://localhost:8080/tickets?status=${filterStatus === "All" ? "" : filterStatus}`
            );
            setTickets(response.data.tickets || []);
        } catch (error) {
            console.error("Error fetching tickets:", error);
        }
    }, [filterStatus]);

    // Load tickets when user logs in
    useEffect(() => {
        if (isAuthenticated) {
            fetchTickets();
        }
    }, [isAuthenticated, fetchTickets]);

    // Reload tickets when filter status changes
    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        if (!newTicket.subject || !newTicket.description) {
            alert("Please fill in both subject and description.");
            return;
        }
        try {
            await axios.post("http://localhost:8080/tickets", newTicket);
            alert("Ticket created successfully!");
            setNewTicket({ subject: "", description: "" });
            fetchTickets();
        } catch (error) {
            console.error("Error creating ticket:", error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            fetchTickets();
            return;
        }
        try {
            const response = await axios.get(
                `http://localhost:8080/tickets/search?q=${searchQuery}`
            );
            setTickets(response.data || []);
        } catch (error) {
            console.error("Error searching tickets:", error);
        }
    };

    const handleView = (ticket) => {
        setSelectedTicket(ticket);
        setIsEditMode(false);
        setIsModalOpen(true);
    };

    const handleEdit = (ticket) => {
        setSelectedTicket(ticket);
        setIsEditMode(true);
        setIsModalOpen(true);
    };

    const handleSaveDescription = async (id, updatedDescription) => {
        try {
            await axios.patch("http://localhost:8080/tickets", {
                ID: id,
                Description: updatedDescription,
            });
            fetchTickets();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error updating ticket description:", error);
        }
    };

    const handleStatusChange = async (id, currentStatus) => {
        const updatedStatus = currentStatus === "Open" ? "Closed" : "Open";
        try {
            await axios.patch("http://localhost:8080/tickets", {
                ID: id,
                Status: updatedStatus,
            });
            fetchTickets();
        } catch (error) {
            console.error("Error updating ticket status:", error);
        }
    };

    const handleDeleteTicket = async (id) => {
        try {
            await axios.delete(`http://localhost:8080/tickets?id=${id}`);
            fetchTickets();
            alert("Ticket deleted successfully!");
        } catch (error) {
            console.error("Error deleting ticket:", error);
            alert("Unable to delete ticket. Please try again.");
        }
    };

    const handleLogout = () => {
        setIsAuthenticated(false);
        setTickets([]);
    };

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <div className={darkMode ? "app-container dark-mode" : "app-container"}>
            <header className="app-header">
                <h1>Biomedical Support Tickets</h1>
                <button onClick={toggleDarkMode} className="toggle-dark-mode-button">
                    {darkMode ? "Light Mode" : "Dark Mode"}
                </button>
            </header>

            {!isAuthenticated ? (
                <button onClick={() => setIsAuthenticated(true)} className="form-button">
                    Enter
                </button>
            ) : (
                <>
                    <button onClick={handleLogout} className="form-button">
                        Logout
                    </button>

                    <section className="ticket-form">
                        <h2>Create a New Ticket</h2>
                        <form onSubmit={handleCreateTicket}>
                            <input
                                type="text"
                                name="subject"
                                placeholder="Enter Subject"
                                value={newTicket.subject}
                                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                className="form-input"
                            />
                            <textarea
                                name="description"
                                placeholder="Enter Description"
                                value={newTicket.description}
                                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                className="form-textarea"
                            />
                            <button type="submit" className="form-button">
                                Create Ticket
                            </button>
                        </form>
                    </section>

                    <section className="search-form">
                        <h2>Search Tickets</h2>
                        <form onSubmit={handleSearch}>
                            <input
                                type="text"
                                placeholder="Search by Subject or Description"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="form-input"
                            />
                            <button type="submit" className="form-button">
                                Search
                            </button>
                        </form>
                    </section>

                    <section className="filter-section">
                        <h2>Filter by Status</h2>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="form-select"
                        >
                            <option value="All">All</option>
                            <option value="Open">Open</option>
                            <option value="Closed">Closed</option>
                        </select>
                    </section>

                    <section className="ticket-list">
                        <h2>All Tickets</h2>
                        {tickets.length === 0 ? (
                            <p>No tickets available.</p>
                        ) : (
                            <ul className="ticket-items">
                                {tickets.map((ticket) => (
                                    <li key={ticket.id} className="ticket-item">
                                        <div className="ticket-details">
                                            <strong>ID: {ticket.id}</strong>
                                            <p>{ticket.subject}</p>
                                            <span className={`status-badge ${ticket.status.toLowerCase()}`}>
                                                {ticket.status}
                                            </span>
                                            <div className="ticket-actions">
                                                <button onClick={() => handleView(ticket)} className="view-button">
                                                    View
                                                </button>
                                                <button onClick={() => handleEdit(ticket)} className="edit-button">
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(ticket.id, ticket.status)}
                                                    className={`status-button ${ticket.status.toLowerCase()}`}
                                                >
                                                    {ticket.status === "Open" ? "Close" : "Open"}
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteTicket(ticket.id)}
                                                    className="delete-button"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {isModalOpen && selectedTicket && (
                        <Modal
                            ticket={selectedTicket}
                            isEditMode={isEditMode}
                            onClose={() => setIsModalOpen(false)}
                            onSave={handleSaveDescription}
                        />
                    )}
                </>
            )}
        </div>
    );
}

const Modal = ({ ticket, isEditMode, onClose, onSave }) => {
    const [updatedDescription, setUpdatedDescription] = useState(ticket.description);

    const handleSave = () => {
        onSave(ticket.id, updatedDescription); // Save the updated description
    };

    return (
        <div className="modal">
            <div className="modal-content">
                <h2>{isEditMode ? "Edit Ticket" : "View Ticket"}</h2>
                <p>
                    <strong>Subject:</strong> {ticket.subject}
                </p>
                {isEditMode ? (
                    <textarea
                        value={updatedDescription}
                        onChange={(e) => setUpdatedDescription(e.target.value)}
                        className="modal-textarea"
                    />
                ) : (
                    <p>
                        <strong>Description:</strong> {ticket.description}
                    </p>
                )}
                <div className="modal-actions">
                    <button onClick={onClose} className="modal-close-button">
                        Close
                    </button>
                    {isEditMode && (
                        <button onClick={handleSave} className="modal-save-button">
                            Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
