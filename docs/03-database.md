# Database Design

## Tables

### 1. users
- id
- username
- password
- role (Admin / Student)

### 2. students
- id
- name
- room_number
- phone
- address
- fee_status

### 3. rooms
- id
- room_number
- capacity
- occupied

### 4. meal_selections
- id
- student_id
- date
- breakfast
- lunch
- dinner

### 5. meal_prices
- id
- breakfast_price
- lunch_price
- dinner_price

### 6. monthly_bills
- id
- student_id
- month
- total_amount
- payment_status