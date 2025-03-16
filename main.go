// main.go
package main

import (
	"encoding/json"
	"log"
	"math"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

type Ticket struct {
	ID          int    `json:"id"`
	Subject     string `json:"subject"`
	Description string `json:"description"`
	Status      string `json:"status"` // "Open" or "Closed"
}

type AuthResponse struct {
	Message string `json:"message"`
}

var tickets []Ticket
var nextID = 1
var ticketsLock sync.Mutex

func main() {
	http.HandleFunc("/tickets", ticketsHandler)
	http.HandleFunc("/tickets/search", ticketSearchHandler)

	log.Println("Server started on http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func ticketsHandler(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		handleGetTickets(w, r)
	case http.MethodPost:
		handleCreateTicket(w, r)
	case http.MethodDelete:
		handleDeleteTicket(w, r)
	case http.MethodPatch:
		handleUpdateTicket(w, r)
	default:
		http.Error(w, "Invalid request method", http.StatusMethodNotAllowed)
	}
}

func handleGetTickets(w http.ResponseWriter, r *http.Request) {
	pageQuery := r.URL.Query().Get("page")
	pageSizeQuery := r.URL.Query().Get("pageSize")
	page, _ := strconv.Atoi(pageQuery)
	pageSize, _ := strconv.Atoi(pageSizeQuery)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 5
	}

	statusFilter := r.URL.Query().Get("status")

	ticketsLock.Lock()
	defer ticketsLock.Unlock()

	var filteredTickets []Ticket
	for _, ticket := range tickets {
		if statusFilter == "" || strings.EqualFold(ticket.Status, statusFilter) {
			filteredTickets = append(filteredTickets, ticket)
		}
	}

	start := (page - 1) * pageSize
	end := start + pageSize
	if start > len(filteredTickets) {
		start = len(filteredTickets)
	}
	if end > len(filteredTickets) {
		end = len(filteredTickets)
	}

	paginatedTickets := filteredTickets[start:end]

	response := map[string]interface{}{
		"tickets":     paginatedTickets,
		"totalPages":  int(math.Ceil(float64(len(filteredTickets)) / float64(pageSize))),
		"currentPage": page,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleCreateTicket(w http.ResponseWriter, r *http.Request) {
    // Ensure the method is POST
    if r.Method != http.MethodPost {
        http.Error(w, "Invalid request method. Only POST is allowed.", http.StatusMethodNotAllowed)
        return
    }

    var ticket Ticket

    // Decode the JSON request body
    if err := json.NewDecoder(r.Body).Decode(&ticket); err != nil {
        http.Error(w, "Invalid ticket data. Please ensure JSON is correctly formatted.", http.StatusBadRequest)
        return
    }

    // Validate required fields
    if strings.TrimSpace(ticket.Subject) == "" || strings.TrimSpace(ticket.Description) == "" {
        http.Error(w, "Invalid ticket data. Both 'subject' and 'description' are required.", http.StatusBadRequest)
        return
    }

    // Lock the tickets slice for safe concurrent access
    ticketsLock.Lock()
    defer ticketsLock.Unlock()

    // Assign an ID and default status
    ticket.ID = nextID
    nextID++
    ticket.Status = "Open"

    // Append the new ticket to the tickets slice
    tickets = append(tickets, ticket)

    // Respond with the created ticket
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated) // Use HTTP 201 Created for successful resource creation
    json.NewEncoder(w).Encode(ticket)
}


func handleDeleteTicket(w http.ResponseWriter, r *http.Request) {
	idQuery := r.URL.Query().Get("id")
	id, err := strconv.Atoi(idQuery)
	if err != nil {
		http.Error(w, "Invalid ticket ID", http.StatusBadRequest)
		return
	}

	ticketsLock.Lock()
	defer ticketsLock.Unlock()

	for i, ticket := range tickets {
		if ticket.ID == id {
			tickets = append(tickets[:i], tickets[i+1:]...)
			w.WriteHeader(http.StatusNoContent)
			return
		}
	}

	http.Error(w, "Ticket not found", http.StatusNotFound)
}

func handleUpdateTicket(w http.ResponseWriter, r *http.Request) {
	var ticketUpdate Ticket
	if err := json.NewDecoder(r.Body).Decode(&ticketUpdate); err != nil {
		http.Error(w, "Invalid ticket data", http.StatusBadRequest)
		return
	}

	ticketsLock.Lock()
	defer ticketsLock.Unlock()

	for i, ticket := range tickets {
		if ticket.ID == ticketUpdate.ID {
			if ticketUpdate.Subject != "" {
				tickets[i].Subject = ticketUpdate.Subject
			}
			if ticketUpdate.Description != "" {
				tickets[i].Description = ticketUpdate.Description
			}
			if ticketUpdate.Status != "" {
				tickets[i].Status = ticketUpdate.Status
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(tickets[i])
			return
		}
	}

	http.Error(w, "Ticket not found", http.StatusNotFound)
}

func ticketSearchHandler(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")

	ticketsLock.Lock()
	defer ticketsLock.Unlock()

	var filteredTickets []Ticket
	for _, ticket := range tickets {
		if strings.Contains(strings.ToLower(ticket.Subject), strings.ToLower(query)) ||
			strings.Contains(strings.ToLower(ticket.Description), strings.ToLower(query)) {
			filteredTickets = append(filteredTickets, ticket)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(filteredTickets)
}