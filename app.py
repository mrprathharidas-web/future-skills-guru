from flask import Flask, request, jsonify
import razorpay
import hmac
import hashlib
import os
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
CORS(app)

client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)

@app.route("/")
def home():
    return "FutureSkills Guru Razorpay Backend (Python) ✅"

# Create Order
@app.route("/create-order", methods=["POST"])
def create_order():
    data = request.json
    amount = data.get("amount")

    if amount not in [149, 499]:
        return jsonify({"error": "Invalid amount"}), 400

    order = client.order.create({
        "amount": amount * 100,  # rupees → paise
        "currency": "INR",
        "receipt": "order_fs"
    })

    return jsonify(order)

# Verify Payment
@app.route("/verify-payment", methods=["POST"])
def verify_payment():
    data = request.json

    body = f"{data['razorpay_order_id']}|{data['razorpay_payment_id']}"
    expected_signature = hmac.new(
        os.getenv("RAZORPAY_KEY_SECRET").encode(),
        body.encode(),
        hashlib.sha256
    ).hexdigest()

    if expected_signature == data["razorpay_signature"]:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False}), 400

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
