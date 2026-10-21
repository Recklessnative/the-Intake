#!/bin/sh
# Every Lindeveld picture, at full size (about 1.5 hours on four cores). Then: python3 town_post.py ../..
set -e
cd "$(dirname "$0")"
python3 town.py townmask 1920 1080
for p in junction flat hall house streets; do python3 town.py shotmask $p 1600 900; done
for a in 1 2 3; do python3 town.py town $a 1920 1080 128; done
python3 town.py shot junction open 1600 900 96
python3 town.py shot junction closed 1600 900 96
python3 town.py shot flat base 1600 900 96
python3 town.py shot flat archive 1600 900 96
for i in rug armchair lamp kettle plant radio; do python3 town.py item $i 1600 900 64; done
python3 town.py shot hall base 1600 900 96
python3 town.py shot hall terminal 1600 900 96
python3 town.py shot house base 1600 900 96
for v in 1 2 3; do python3 town.py shot streets $v 1600 900 96; done
