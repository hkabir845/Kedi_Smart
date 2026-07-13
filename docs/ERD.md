# Entity Relationship Diagram

## Core Entities

### User & Authentication
```
User
├── id (PK)
├── email (UNIQUE)
├── password_hash
├── role (ENUM)
├── is_active
├── is_verified
└── timestamps

UserProfile
├── id (PK)
├── user_id (FK -> User.id, UNIQUE)
├── full_name
├── phone
├── city, country, address
├── avatar_url
├── bio
├── emergency_contact (JSON)
├── privacy_settings (JSON)
└── timestamps

VerificationRequest
├── id (PK)
├── user_id (FK -> User.id)
├── type (ENUM: vet/vendor/seller/shelter)
├── docs_urls (JSON)
├── status (ENUM: pending/approved/rejected)
├── admin_notes
└── timestamps
```

### Pet Management
```
Pet
├── id (PK)
├── owner_user_id (FK -> User.id)
├── name
├── species (ENUM)
├── breed
├── gender (ENUM)
├── dob, age_text
├── color_markings
├── weight_kg
├── spayed_neutered
├── temperament, special_needs
└── timestamps

PetPhoto
├── id (PK)
├── pet_id (FK -> Pet.id)
├── url
└── is_primary

PetPrivacySetting
├── id (PK)
├── pet_id (FK -> Pet.id, UNIQUE)
├── public_fields (JSON)
├── allow_call, allow_whatsapp, allow_chat
├── show_city_only, show_reward_note

PetMedicalRecord
├── id (PK)
├── pet_id (FK -> Pet.id)
├── created_by_user_id (FK -> User.id)
├── type, title, notes
├── attachments (JSON)
└── record_date, timestamps

Vaccination
├── id (PK)
├── pet_id (FK -> Pet.id)
├── vaccine_name
├── date_given, next_due_date
├── vet_user_id (FK -> User.id)
├── notes
└── timestamps

Prescription
├── id (PK)
├── pet_id (FK -> Pet.id)
├── vet_user_id (FK -> User.id)
├── issued_at
├── medication_list (JSON)
├── notes, attachments (JSON)
└── timestamps
```

### NFC/QR Tags
```
NFCTag
├── id (PK)
├── sku_product_id (FK -> Product.id, nullable)
├── tag_uid (UNIQUE)
├── nfc_url, qr_url
├── status (ENUM)
└── timestamps

TagActivation
├── id (PK)
├── tag_id (FK -> NFCTag.id)
├── pet_id (FK -> Pet.id)
├── owner_user_id (FK -> User.id)
├── activated_at, deactivated_at
└── active (bool), timestamps

LostPetReport
├── id (PK)
├── pet_id (FK -> Pet.id)
├── owner_user_id (FK -> User.id)
├── last_seen_location_text
├── last_seen_lat/lng
├── reward_note
├── status (ENUM)
├── activated_at, closed_at
└── timestamps

MaskedMessageThread
├── id (PK)
├── pet_id (FK -> Pet.id)
├── owner_user_id (FK -> User.id)
├── finder_session_id
└── timestamps

MaskedMessage
├── id (PK)
├── thread_id (FK -> MaskedMessageThread.id)
├── sender_type (ENUM)
├── message
└── timestamps
```

### Content & SEO
```
AnimalCategory
├── id (PK)
├── slug (UNIQUE)
└── name, timestamps

ContentTopic
├── id (PK)
├── category_id (FK -> AnimalCategory.id)
├── slug (UNIQUE)
├── title, excerpt, body_md
├── cover_image_url
├── author_user_id (FK -> User.id)
├── vet_verified (bool)
├── status (ENUM)
├── published_at
└── timestamps

ContentTag
├── id (PK)
├── slug (UNIQUE)
└── name, timestamps

ContentTopicTag (Junction)
├── topic_id (FK -> ContentTopic.id, PK)
└── tag_id (FK -> ContentTag.id, PK)

FAQItem
├── id (PK)
├── topic_id (FK -> ContentTopic.id)
├── question, answer
└── timestamps

SEOSetting
├── id (PK)
├── entity_type, entity_id (composite index)
├── meta_title, meta_description
├── canonical_url, og_image_url
├── noindex (bool)
├── json_ld_override (JSON)
└── timestamps
```

### Blog
```
BlogPost
├── id (PK)
├── author_user_id (FK -> User.id)
├── slug (UNIQUE)
├── title, excerpt, body_md
├── cover_image_url
├── status (ENUM)
├── published_at
└── timestamps

BlogComment
├── id (PK)
├── post_id (FK -> BlogPost.id)
├── user_id (FK -> User.id)
├── body
└── timestamps

BlogLike
├── id (PK)
├── post_id (FK -> BlogPost.id)
├── user_id (FK -> User.id)
└── timestamps
```

### E-commerce
```
ProductCategory
├── id (PK)
├── parent_id (FK -> ProductCategory.id, nullable)
├── slug (UNIQUE)
├── name, description
└── timestamps

Product
├── id (PK)
├── vendor_user_id (FK -> User.id, nullable)
├── category_id (FK -> ProductCategory.id)
├── slug (UNIQUE)
├── title, description_md
├── brand
├── status (ENUM)
├── is_digital, is_nfc_tag_product
└── timestamps

ProductVariant
├── id (PK)
├── product_id (FK -> Product.id)
├── sku (UNIQUE)
├── price, compare_at_price
├── currency
├── weight_kg, size, flavor
├── stock_qty
├── is_active
└── timestamps

Cart
├── id (PK)
├── user_id (FK -> User.id, nullable)
├── session_id (nullable)
└── timestamps

CartItem
├── id (PK)
├── cart_id (FK -> Cart.id)
├── variant_id (FK -> ProductVariant.id)
└── qty, timestamps

Order
├── id (PK)
├── user_id (FK -> User.id, nullable)
├── guest_email (nullable)
├── status (ENUM)
├── subtotal, discount, shipping_fee, tax, total
├── currency
└── timestamps

OrderItem
├── id (PK)
├── order_id (FK -> Order.id)
├── variant_id (FK -> ProductVariant.id, nullable)
├── title_snapshot, price_snapshot
└── qty, timestamps

Payment
├── id (PK)
├── order_id (FK -> Order.id)
├── method (ENUM)
├── status (ENUM)
├── reference
└── timestamps

ShippingAddress
├── id (PK)
├── order_id (FK -> Order.id, UNIQUE)
├── name, phone
├── address, city, country
└── notes, timestamps
```

### Veterinary Services
```
VetProfile
├── id (PK)
├── user_id (FK -> User.id, UNIQUE)
├── clinic_name
├── specialties (JSON)
├── years_experience
├── license_no
├── address, city, country
├── online_consultation_enabled
├── verification_status
└── timestamps

VetAvailability
├── id (PK)
├── vet_user_id (FK -> VetProfile.user_id)
├── day_of_week (0-6)
├── start_time, end_time
├── mode (ENUM: online/clinic)
└── timestamps

Appointment
├── id (PK)
├── pet_id (FK -> Pet.id)
├── owner_user_id (FK -> User.id)
├── vet_user_id (FK -> VetProfile.user_id)
├── scheduled_at
├── mode (ENUM)
├── status (ENUM)
├── notes
└── timestamps

ConsultationNote
├── id (PK)
├── appointment_id (FK -> Appointment.id)
├── vet_user_id (FK -> User.id)
├── notes
├── attachments (JSON)
└── timestamps
```

### Marketplace
```
PetListing
├── id (PK)
├── seller_user_id (FK -> User.id)
├── pet_id (FK -> Pet.id, nullable)
├── species, breed, age_text, gender
├── location_text
├── price, currency
├── type (ENUM: sale/adoption/giveaway/cubs)
├── vaccination_status_text
├── description_md
├── status (ENUM)
└── timestamps

ListingPhoto
├── id (PK)
├── listing_id (FK -> PetListing.id)
└── url, timestamps

ListingReport
├── id (PK)
├── listing_id (FK -> PetListing.id)
├── reporter_user_id (FK -> User.id, nullable)
├── reason
└── timestamps
```

### Platform/Admin
```
SiteSetting
├── id (PK)
├── key (UNIQUE)
├── value_json (JSON)
└── timestamps

ModerationQueue
├── id (PK)
├── entity_type, entity_id (composite index)
├── status (ENUM)
├── admin_user_id (FK -> User.id)
├── notes
└── timestamps

AuditLog
├── id (PK)
├── actor_user_id (FK -> User.id)
├── action
├── entity_type, entity_id (composite index)
├── meta_json (JSON)
└── timestamps

Notification
├── id (PK)
├── user_id (FK -> User.id)
├── type (ENUM)
├── title, body
├── read (bool)
└── timestamps
```

## Key Relationships

1. **User → UserProfile**: One-to-One
2. **User → Pet**: One-to-Many (owner)
3. **Pet → PetPhoto**: One-to-Many
4. **Pet → TagActivation**: One-to-Many (via NFC)
5. **Product → ProductVariant**: One-to-Many
6. **Order → OrderItem**: One-to-Many
7. **VetProfile → Appointment**: One-to-Many
8. **PetListing → ListingPhoto**: One-to-Many
9. **ContentTopic → FAQItem**: One-to-Many

## Indexes

- Foreign keys are indexed by SQLAlchemy
- Unique fields (email, slug, tag_uid, etc.) have unique indexes
- Composite indexes on entity_type + entity_id for SEO settings, moderation queue, audit log
