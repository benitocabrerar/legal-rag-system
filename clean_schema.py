#!/usr/bin/env python3
"""Remove duplicate UserSession model from Prisma schema"""

with open('prisma/schema.prisma', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the line where the duplicate starts
duplicate_start = None
for i, line in enumerate(lines):
    if i > 2460 and 'User Session for context-aware search' in line:
        duplicate_start = i - 1  # Include the blank line before comment
        break

if duplicate_start:
    # Keep only lines up to the duplicate
    lines = lines[:duplicate_start]

    # Write back
    with open('prisma/schema.prisma', 'w', encoding='utf-8') as f:
        f.writelines(lines)

    print(f"Removed duplicate starting at line {duplicate_start + 1}")
    print(f"New file has {len(lines)} lines")
else:
    print("No duplicate found")
