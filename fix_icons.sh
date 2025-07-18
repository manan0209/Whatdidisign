#!/bin/bash

# Quick icon check and regeneration script for WhatDidISign extension
# Run this if icons are missing after build

DIST_ICONS_DIR="/Users/manangoel/Developer/WhatDidISign/dist/icons"
SRC_ICONS_DIR="/Users/manangoel/Developer/WhatDidISign/icons"

echo "🔍 Checking for required icon files..."

# Check if all required PNG files exist in dist
REQUIRED_ICONS=("icon16.png" "icon32.png" "icon48.png" "icon128.png")
MISSING_ICONS=()

for icon in "${REQUIRED_ICONS[@]}"; do
    if [ ! -f "$DIST_ICONS_DIR/$icon" ]; then
        MISSING_ICONS+=("$icon")
    fi
done

if [ ${#MISSING_ICONS[@]} -eq 0 ]; then
    echo "✅ All icons present!"
    exit 0
fi

echo "❌ Missing icons: ${MISSING_ICONS[*]}"
echo "🎨 Regenerating icons..."

# Create icons using Python PIL
cd "$DIST_ICONS_DIR"
python3 << 'EOF'
from PIL import Image, ImageDraw

# Create a 128x128 base image with Google blue background
img = Image.new('RGBA', (128, 128), (66, 133, 244, 255))
draw = ImageDraw.Draw(img)

# Add a document shape (white rectangle with rounded corners)
draw.rounded_rectangle([24, 16, 104, 112], radius=8, fill=(255, 255, 255, 255), outline=(26, 115, 232, 255), width=3)

# Add lines to represent text
for i, y in enumerate([32, 44, 56, 68, 80, 92]):
    width = 60 if i < 4 else 40
    draw.rectangle([32, y, 32 + width, y + 3], fill=(66, 133, 244, 255))

# Add a green checkmark circle in bottom right  
draw.ellipse([80, 80, 112, 112], fill=(52, 168, 83, 255))
# Checkmark
draw.polygon([(88, 96), (96, 104), (104, 88)], fill=(255, 255, 255, 255))

# Save all required sizes
img.save('icon128.png', 'PNG')
img.resize((48, 48), Image.Resampling.LANCZOS).save('icon48.png', 'PNG')
img.resize((32, 32), Image.Resampling.LANCZOS).save('icon32.png', 'PNG') 
img.resize((16, 16), Image.Resampling.LANCZOS).save('icon16.png', 'PNG')

print('✅ Icons regenerated successfully!')
EOF

# Copy to source folder for future builds
cp *.png "$SRC_ICONS_DIR/"

echo "🎉 Icon regeneration complete!"
echo "📁 Icons saved to both dist/ and src/ folders"
