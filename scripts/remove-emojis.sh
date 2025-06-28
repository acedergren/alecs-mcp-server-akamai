#!/bin/bash
# CODE KAI: Systematic emoji removal for Snow Leopard v1.7.0
# Replace emojis with clear text equivalents for cross-platform compatibility

echo "Starting emoji removal for Snow Leopard v1.7.0..."

# Find all TypeScript files
files=$(find src -name "*.ts" -type f)
total_files=$(echo "$files" | wc -l)
files_changed=0

echo "Found $total_files TypeScript files to process..."

# Process each file
for file in $files; do
    temp_file="${file}.tmp"
    changed=false
    
    # Copy original file
    cp "$file" "$temp_file"
    
    # Replace emojis with text equivalents
    # Status indicators
    sed -i '' 's/✅/[OK]/g' "$temp_file" && changed=true
    sed -i '' 's/❌/[ERROR]/g' "$temp_file" && changed=true
    sed -i '' 's/⚠️/[WARNING]/g' "$temp_file" && changed=true
    sed -i '' 's/🟢/[READY]/g' "$temp_file" && changed=true
    sed -i '' 's/🟡/[PENDING]/g' "$temp_file" && changed=true
    sed -i '' 's/🔴/[FAILED]/g' "$temp_file" && changed=true
    
    # Action indicators
    sed -i '' 's/🎯/[TARGET]/g' "$temp_file" && changed=true
    sed -i '' 's/🔍/[SEARCH]/g' "$temp_file" && changed=true
    sed -i '' 's/⚡/[FAST]/g' "$temp_file" && changed=true
    sed -i '' 's/🚀/[DEPLOY]/g' "$temp_file" && changed=true
    sed -i '' 's/🛡️/[SECURE]/g' "$temp_file" && changed=true
    sed -i '' 's/🔒/[LOCKED]/g' "$temp_file" && changed=true
    sed -i '' 's/🔧/[CONFIG]/g' "$temp_file" && changed=true
    sed -i '' 's/📊/[REPORT]/g' "$temp_file" && changed=true
    sed -i '' 's/📋/[LIST]/g' "$temp_file" && changed=true
    
    # Context indicators
    sed -i '' 's/🌐/[GLOBAL]/g' "$temp_file" && changed=true
    sed -i '' 's/🏢/[ENTERPRISE]/g' "$temp_file" && changed=true
    sed -i '' 's/👨‍💼/[USER]/g' "$temp_file" && changed=true
    sed -i '' 's/☁️/[CLOUD]/g' "$temp_file" && changed=true
    
    # Architecture indicators
    sed -i '' 's/🏗️/[ARCHITECTURE]/g' "$temp_file" && changed=true
    sed -i '' 's/💾/[DATA]/g' "$temp_file" && changed=true
    sed -i '' 's/🔐/[AUTH]/g' "$temp_file" && changed=true
    sed -i '' 's/📦/[PACKAGE]/g' "$temp_file" && changed=true
    sed -i '' 's/🎭/[MULTI-TENANT]/g' "$temp_file" && changed=true
    sed -i '' 's/🔄/[SYNC]/g' "$temp_file" && changed=true
    sed -i '' 's/🌍/[WORLDWIDE]/g' "$temp_file" && changed=true
    sed -i '' 's/🏆/[BEST-PRACTICE]/g' "$temp_file" && changed=true
    sed -i '' 's/💡/[TIP]/g' "$temp_file" && changed=true
    sed -i '' 's/🚨/[ALERT]/g' "$temp_file" && changed=true
    sed -i '' 's/📈/[METRICS]/g' "$temp_file" && changed=true
    sed -i '' 's/🗄️/[STORAGE]/g' "$temp_file" && changed=true
    sed -i '' 's/🔑/[KEY]/g' "$temp_file" && changed=true
    sed -i '' 's/📡/[NETWORK]/g' "$temp_file" && changed=true
    sed -i '' 's/🖥️/[SERVER]/g' "$temp_file" && changed=true
    sed -i '' 's/🎪/[ORCHESTRATION]/g' "$temp_file" && changed=true
    sed -i '' 's/🔗/[LINK]/g' "$temp_file" && changed=true
    sed -i '' 's/📝/[DOCUMENT]/g' "$temp_file" && changed=true
    sed -i '' 's/🏃/[RUNNING]/g' "$temp_file" && changed=true
    sed -i '' 's/⏱️/[TIMING]/g' "$temp_file" && changed=true
    sed -i '' 's/🎨/[DESIGN]/g' "$temp_file" && changed=true
    sed -i '' 's/🚦/[STATUS]/g' "$temp_file" && changed=true
    sed -i '' 's/🔬/[ANALYSIS]/g' "$temp_file" && changed=true
    sed -i '' 's/🏷️/[TAG]/g' "$temp_file" && changed=true
    sed -i '' 's/📌/[PINNED]/g' "$temp_file" && changed=true
    
    # Additional emojis
    sed -i '' 's/✨/[NEW]/g' "$temp_file" && changed=true
    sed -i '' 's/🎉/[CELEBRATE]/g' "$temp_file" && changed=true
    sed -i '' 's/👍/[GOOD]/g' "$temp_file" && changed=true
    sed -i '' 's/💪/[STRONG]/g' "$temp_file" && changed=true
    sed -i '' 's/🔥/[HOT]/g' "$temp_file" && changed=true
    sed -i '' 's/⭐/[STAR]/g' "$temp_file" && changed=true
    sed -i '' 's/📚/[DOCS]/g' "$temp_file" && changed=true
    sed -i '' 's/📄/[FILE]/g' "$temp_file" && changed=true
    sed -i '' 's/📁/[FOLDER]/g' "$temp_file" && changed=true
    sed -i '' 's/⚙️/[SETTINGS]/g' "$temp_file" && changed=true
    sed -i '' 's/🔨/[BUILD]/g' "$temp_file" && changed=true
    sed -i '' 's/📢/[ANNOUNCE]/g' "$temp_file" && changed=true
    sed -i '' 's/🚩/[FLAG]/g' "$temp_file" && changed=true
    sed -i '' 's/💎/[PREMIUM]/g' "$temp_file" && changed=true
    sed -i '' 's/🎁/[GIFT]/g' "$temp_file" && changed=true
    sed -i '' 's/🏁/[FINISH]/g' "$temp_file" && changed=true
    sed -i '' 's/✔️/[CHECK]/g' "$temp_file" && changed=true
    sed -i '' 's/❓/[QUESTION]/g' "$temp_file" && changed=true
    sed -i '' 's/❗/[IMPORTANT]/g' "$temp_file" && changed=true
    sed -i '' 's/💬/[COMMENT]/g' "$temp_file" && changed=true
    sed -i '' 's/📅/[CALENDAR]/g' "$temp_file" && changed=true
    sed -i '' 's/⏰/[TIME]/g' "$temp_file" && changed=true
    sed -i '' 's/🌟/[FEATURE]/g' "$temp_file" && changed=true
    sed -i '' 's/🆕/[NEW]/g' "$temp_file" && changed=true
    sed -i '' 's/🔔/[NOTIFY]/g' "$temp_file" && changed=true
    sed -i '' 's/💻/[CODE]/g' "$temp_file" && changed=true
    sed -i '' 's/🌈/[RAINBOW]/g' "$temp_file" && changed=true
    sed -i '' 's/🎈/[BALLOON]/g' "$temp_file" && changed=true
    sed -i '' 's/🎯/[GOAL]/g' "$temp_file" && changed=true
    sed -i '' 's/🤖/[BOT]/g' "$temp_file" && changed=true
    
    # Check if file was actually changed
    if ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        ((files_changed++))
        echo "Updated: $file"
    else
        rm "$temp_file"
    fi
done

echo ""
echo "Emoji removal complete!"
echo "Files changed: $files_changed"
echo "Total files processed: $total_files"

# Run build to verify no issues
echo ""
echo "Running build to verify changes..."
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "[OK] Build successful! No issues introduced by emoji removal."
else
    echo ""
    echo "[ERROR] Build failed! Please check the errors above."
    exit 1
fi