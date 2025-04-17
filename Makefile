
PHONY := clean image run

clean:
	docker rmi --force simojenki/hls-proxy:latest

image:
	docker build --pull -t simojenki/hls-proxy:latest .

run: image
	docker run \
		-it \
		--rm \
		--name hls-proxy \
		simojenki/hls-proxy