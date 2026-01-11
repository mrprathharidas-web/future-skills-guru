from flask import Flask, request, jsonify
from flask_cors import CORS
import razorpay
import hmac
import hashlib
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Razorpay client
razorpay_client = razorpay.Client(
    auth=(
        os.getenv("RAZORPAY_KEY_ID"),
        os.getenv("RAZORPAY_KEY_SECRET")
    )
)

# ---------- HEALTH CHECK (RENDER NEEDS THIS) ----------
@app.route("/")
def home():
    return "✅ FutureSkills Guru Python Backend is running"

# ---------- CREATE ORDER ----------
@app.route("/create-order", methods=["POST"])
def create_order():
    try:
        data = request.get_json()
        amount = data.get("amount")

        if amount not in [149, 499]:
            return jsonify({"error": "Invalid amount"}), 400

        order = razorpay_client.order.create({
            "amount": amount * 100,   # rupees → paise
            "currency": "INR",
            "receipt": f"order_{amount}"
        })

        return jsonify(order)

    except Exception as e:
        print("Create order error:", e)
        return jsonify({"error": "Order creation failed"}), 500

# ---------- VERIFY PAYMENT ----------
@app.route("/verify-payment", methods=["POST"])
def verify_payment():
    try:
        data = request.get_json()

        order_id = data.get("razorpay_order_id")
        payment_id = data.get("razorpay_payment_id")
        signature = data.get("razorpay_signature")

        body = f"{order_id}|{payment_id}"

        expected_signature = hmac.new(
            os.getenv("RAZORPAY_KEY_SECRET").encode(),
            body.encode(),
            hashlib.sha256
        ).hexdigest()

        if expected_signature == signature:
            return jsonify({"success": True})
        else:
            return jsonify({"success": False}), 400

    except Exception as e:
        print("Verify payment error:", e)
        return jsonify({"success": False}), 500

# ---------- PORT FIX (MOST IMPORTANT) ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
