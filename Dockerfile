FROM alpine:3.6

RUN apk update && \
    apk add nodejs-npm && \
    npm install dongnelibrary -g && \
    rm /var/cache/apk/*

#CMD ["dongnelibrary"]
