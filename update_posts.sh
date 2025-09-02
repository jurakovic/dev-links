#!/bin/bash

echo "test"

yq -Version || {
	echo "jq is not installed. Please install jq to proceed."
}

find posts
