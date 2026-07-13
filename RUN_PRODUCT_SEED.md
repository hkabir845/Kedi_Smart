# How to Populate Products in the Shop

## Quick Fix: Run the Product Seed Script

The shop page is working correctly, but the database needs to be populated with products. 

### Steps to Add Products:

1. **Make sure the backend server is running** (if needed for database access)

2. **Run the seed script from the backend directory:**

```bash
cd backend
python ../scripts/seed_comprehensive_products.py
```

Or if using virtual environment:
```bash
cd backend
.venv\Scripts\python.exe ..\scripts\seed_comprehensive_products.py
```

### What This Script Does:

- Creates **10 product categories**:
  - Pet Food
  - Toys & Play
  - Accessories
  - Grooming
  - Health & Medicine
  - Beds & Comfort
  - Litter & Waste
  - Training
  - Travel & Carriers
  - Feeding

- Adds **150+ products** across all categories
- All products are priced in **BDT (Bangladeshi Taka)**
- Products include variants, descriptions, and pricing

### After Running:

1. Refresh your browser at `http://localhost:3000/shop`
2. You should now see all the products displayed
3. You can browse, filter by category, and search products

### Troubleshooting:

- If you get an error, make sure:
  - The backend database exists
  - You're in the correct directory
  - The virtual environment is activated (if using one)
  - Python can access the backend modules
