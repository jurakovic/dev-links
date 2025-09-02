#!/bin/bash

echo "test"

jq -Version || {
	echo "jq is not installed. Please install jq to proceed."
}

find posts
