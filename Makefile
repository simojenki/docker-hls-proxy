
PHONY := clean image run

clean:
	docker rmi --force simojenki/hls-proxy:latest

image:
	docker build --pull -t simojenki/hls-proxy:latest .

run: image
	docker run \
		-it \
		-p 3000:3000 \
		--rm \
		--name hls-proxy \
		simojenki/hls-proxy