#!/bin/bash

# Define new collections that need admin read/write
collections=(
  "analytics_data" "shopping_store" "digital_products" "media_store"
  "coupons" "inventory" "reviews" "admins" "customer_activity" "returns"
  "pages" "banners" "menus" "announcements" "seo_settings" "app_versions"
  "downloads" "release_notes" "authors" "book_categories" "ebooks"
  "book_orders" "audio_media" "media_categories" "storage_stats"
  "security_settings" "store_settings" "payment_settings" "shipping_settings"
  "notifications_settings" "admin_settings"
)

rules=""
for coll in "${collections[@]}"; do
  rules+="\n    match /${coll}/{docId} {\n      allow read, write: if isAdmin();\n    }\n"
done

# Insert the rules right before the catch-all
sed -i "/match \/{document=\*\*}/i $rules" firestore.rules
