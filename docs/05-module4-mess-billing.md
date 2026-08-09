# Module 4: Monthly Mess Billing Documentation

## Overview
Module 4 automatically aggregates student meal attendance (Breakfast, Lunch, Dinner selections), retrieves active per-meal rates, calculates monthly total mess charges, generates formal bill statements, and tracks payment status (`PAID` / `UNPAID`).

---

## Data Model & Relationships

```
+------------------+         +------------------+         +-------------------+
|     Student      | 1 --- * |  MealSelection   | 1 --- * |   MonthlyBill     |
|------------------|         |------------------|         |-------------------|
| id               |         | id               |         | id                |
| name             |         | student_id (FK)  |         | student_id (FK)   |
| roll_no          |         | date             |         | month (YYYY-MM)   |
| room_number (FK) |         | breakfast (bool) |         | total_breakfasts  |
+------------------+         | lunch (bool)     |         | total_lunches     |
                             | dinner (bool)    |         | total_dinners     |
                             +------------------+         | breakfast_rate    |
                                                          | lunch_rate        |
                                                          | dinner_rate       |
                                                          | total_amount      |
                                                          | payment_status    |
                                                          +-------------------+
```

---

## Billing Calculation Formula

$$\text{Total Mess Bill} = (N_B \times R_B) + (N_L \times R_L) + (N_D \times R_D)$$

Where:
- $N_B, N_L, N_D$: Total number of Breakfasts, Lunches, and Dinners consumed in the target month ($N_B \ge 0$).
- $R_B, R_L, R_D$: Price rate per meal (e.g. ₹40.00, ₹70.00, ₹60.00).

---

## API Endpoints (Module 4)

### 1. Generate Monthly Mess Bills
- **Endpoint**: `POST /api/billing/generate`
- **Access**: Admin only
- **Payload**:
```json
{
  "month": "2026-08",
  "student_id": null
}
```

### 2. View Monthly Bills (Admin)
- **Endpoint**: `GET /api/billing/admin?month=2026-08&payment_status=UNPAID`
- **Access**: Admin only

### 3. Update Bill Payment Status
- **Endpoint**: `PUT /api/billing/{bill_id}/status`
- **Access**: Admin only
- **Payload**:
```json
{
  "payment_status": "PAID"
}
```

### 4. View Student Bills (Student Portal)
- **Endpoint**: `GET /api/billing/student`
- **Access**: Student only
