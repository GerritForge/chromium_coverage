/*
Copyright 2020 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
*/

const styleElement = document.createElement('dom-module');
styleElement.innerHTML =
  `<template>
     <style>
       .coverage-percentage-column {
         display: inline-block;
         min-width: 3.5em;
         text-align: center;
       }
       .coverage-percentage-column.hidden {
         display: none;
       }
     </style>
  </template>`;
styleElement.register('coverage-column-styles');

export {};
