FROM php:8.3-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring opcache \
    && a2enmod headers expires \
    && rm -rf /var/lib/apt/lists/*

COPY docker/apache.conf /etc/apache2/conf-available/ziwei.conf
RUN a2enconf ziwei
COPY docker/php.ini /usr/local/etc/php/conf.d/99-ziwei.ini
COPY public/ /var/www/html/
COPY src/ /var/www/src/
WORKDIR /var/www/html
