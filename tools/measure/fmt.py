#!/usr/bin/env python3
"""Rewrite views.json readably: one level per line, number lists kept on one line."""
import json, os, re, sys
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'views.json')
d = json.load(open(p))
s = json.dumps(d, indent=2, ensure_ascii=False)
s = re.sub(r'\[\s+([-\d.,\s]+?)\s+\]', lambda m: '[' + ', '.join(x.strip() for x in m.group(1).split(',')) + ']', s)
s = re.sub(r'\[\s+(\[[-\d., ]+\](?:,\s+\[[-\d., ]+\])*)\s+\]', lambda m: '[' + re.sub(r',\s+\[', ', [', m.group(1)) + ']', s)
open(p, 'w').write(s + '\n')
