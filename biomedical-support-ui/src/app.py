from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

tickets = []  # In-memory storage (replace with a database later)

@app.route('/tickets', methods=['GET', 'POST'])
def manage_tickets():
    if request.method == 'POST':
        data = request.get_json()
        new_ticket = {
            'id': len(tickets) + 1,
            'subject': data['subject'],
            'description': data['description'],
            'status': 'Open',  # Default status
        }
        tickets.append(new_ticket)
        return jsonify(new_ticket), 201  # Return created ticket and 201 status
    else:
        return jsonify({'tickets': tickets}) #Get functionality

if __name__ == '__main__':
    app.run(port=8080)