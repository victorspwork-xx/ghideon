import sys

with open('src/ui/fullview/GuideContent.tsx', 'r') as f:
    lines = f.readlines()

start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if "{!hasCoverStep && (" in line:
        start_idx = i + 1
        break

for i in range(start_idx, len(lines)):
    if "          <div className=\"flex items-center gap-1.5 mt-2 mb-4 flex-wrap\">" in lines[i]:
        end_idx = i - 1
        break

if start_idx != -1 and end_idx != -1:
    new_lines = lines[:start_idx]
    new_lines.append('            <div className="mb-4">\n')
    new_lines.append('              <GuideCoverCard\n')
    new_lines.append('                guide={data.guide}\n')
    new_lines.append('                editable={!preview && editing}\n')
    new_lines.append('              />\n')
    new_lines.append('            </div>\n')
    new_lines.append('          )}\n\n')
    new_lines.extend(lines[end_idx+1:])
    
    with open('src/ui/fullview/GuideContent.tsx', 'w') as f:
        f.writelines(new_lines)
    print("Replaced lines successfully")
else:
    print(f"Failed to find bounds: {start_idx}, {end_idx}")

