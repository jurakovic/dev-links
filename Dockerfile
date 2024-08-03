
FROM bretfisher/jekyll-serve:stable-20240715-2119a31

#RUN cat << 'EOF' > /site/Gemfile
#source "https://rubygems.org"
#
#gem "webrick"
#gem "jekyll", "~> 4.2.0"
#gem "jekyll-remote-theme"
#EOF


RUN echo 'source "https://rubygems.org"' > /site/Gemfile
RUN echo '' >> /site/Gemfile
RUN echo 'gem "webrick"' >> /site/Gemfile
RUN echo 'gem "jekyll", "~> 4.2.0"' >> /site/Gemfile
RUN echo 'gem "jekyll-remote-theme"' >> /site/Gemfile


RUN bundle install

#CMD [ "bundle", "exec", "jekyll", "serve", "--force_polling", "--verbose", "-H", "0.0.0.0", "-P", "4000" ]
CMD [ "bundle", "exec", "jekyll", "serve", "--verbose", "-H", "0.0.0.0", "-P", "4000" ]
